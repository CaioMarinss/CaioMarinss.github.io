import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  InjectionToken,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { LanguageService } from '../content/language';
import { PageService } from '../content/page';
import { DisplayMode } from './display-mode';
import { ProjectHover } from './project-hover';
import type { CinemaScene, CinemaSceneOptions, ThreeModule } from './scene/cinema-scene';
import { ScrollDirector } from './scroll-director';

/** What the component needs from the scene (a fake in tests). */
export type SceneHandle = Pick<
  CinemaScene,
  'setProgress' | 'setPointer' | 'nudge' | 'setLayerLabels' | 'getLayerAnchors' | 'resize' | 'render' | 'dispose'
>;

/** The only runtime import of `three`: a lazy chunk loaded after the first render. */
export const THREE_LOADER = new InjectionToken<() => Promise<ThreeModule>>('THREE_LOADER', {
  providedIn: 'root',
  factory: () => () => import('three'),
});

export type SceneFactory = (canvas: HTMLCanvasElement, opts: CinemaSceneOptions) => SceneHandle;

/** Scene code (shapes, shaders) is lazy as well, so the initial bundle carries none of the 3D layer. */
export const CINEMA_SCENE_LOADER = new InjectionToken<() => Promise<SceneFactory>>('CINEMA_SCENE_LOADER', {
  providedIn: 'root',
  factory: () => () =>
    import('./scene/cinema-scene').then(({ CinemaScene }) => (canvas, opts) => new CinemaScene(canvas, opts)),
});

/** Front → API → database, top to bottom, matching the layers of shape 2. */
const LAYER_LABELS = ['Angular', 'Spring Boot + JWT', 'MySQL'] as const;
/** Labels keep following the scene this long after turning off (covers the CSS fade-out). */
const LABEL_FADE_MS = 500;
const PREVIEW_LERP = 0.14;
const PREVIEW_GAP = 24;
const PREVIEW_WIDTH = 280;
const PREVIEW_TOP = 88;
/** Same breakpoint as MOBILE_QUERY: at or below it the list takes the full width. */
const PREVIEW_MIN_VIEWPORT = 860;

/**
 * Preview box position: anchored to the right of the project list so it never covers a row,
 * following the pointer only vertically (centred on it, kept below the header and inside the viewport).
 */
export function previewPosition(
  listRight: number | null,
  pointerY: number,
  height: number,
  viewport: { width: number; height: number },
): { x: number; y: number } | null {
  // No list, a mobile-width layout, or no free column to its right: show nothing rather than cover rows.
  if (listRight === null || viewport.width <= PREVIEW_MIN_VIEWPORT) return null;
  const x = listRight + PREVIEW_GAP;
  if (x + PREVIEW_WIDTH + 16 > viewport.width) return null;
  const y = Math.min(Math.max(pointerY - height / 2, PREVIEW_TOP), viewport.height - height - 16);
  return { x, y: Math.max(y, PREVIEW_TOP) };
}
const MOBILE_QUERY = '(max-width: 860px)';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Full-screen WebGL layer of the cinema mode. Loads Three.js lazily, renders from the
 * ScrollDirector's frame loop and overlays HTML labels/previews driven by the hovered project.
 * Any failure (chunk, constructor, lost context) drops the page to the static mode.
 */
@Component({
  selector: 'app-cinema-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <canvas #canvas></canvas>
    <ul class="layers" [class.on]="labelsOn()">
      @for (label of labels; track label) {
        <li #label><span>{{ label }}</span></li>
      }
    </ul>
    @if (preview(); as pv) {
      <img
        #preview
        class="preview"
        [class.on]="previewOn()"
        [src]="pv.src"
        alt=""
        [width]="pv.width"
        [height]="pv.height"
        [style.aspect-ratio]="pv.width + ' / ' + pv.height"
        decoding="async"
        (error)="markFailed(pv.src)"
      />
    }
  `,
  styles: `
    :host {
      pointer-events: none;
    }
    canvas {
      position: fixed;
      inset: 0;
      z-index: -1;
      display: block;
      width: 100%;
      height: 100%;
    }
    .layers {
      margin: 0;
      padding: 0;
      list-style: none;
      opacity: 0;
      transition: opacity 0.45s var(--ease);
    }
    .layers.on {
      opacity: 1;
    }
    /* Annotation: a dot on the layer centre, the tag to its left (towards the project list). */
    li {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 3; /* over the editorial layer */
      will-change: transform;
    }
    li::after {
      content: '';
      position: absolute;
      top: -3px;
      left: -3px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
    }
    span {
      position: absolute;
      top: 0;
      right: 14px;
      translate: 0 -50%;
      padding: 5px 10px;
      font: 400 10.5px / 1.4 var(--font-mono);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--accent);
      background: rgb(7 4 5 / 0.86);
      border: 1px solid rgb(255 77 94 / 0.45);
      border-radius: 2px;
    }
    .preview {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 4;
      width: 280px;
      height: auto;
      object-fit: cover;
      border: 1px solid var(--line);
      border-radius: 2px;
      box-shadow: 0 24px 60px rgb(0 0 0 / 0.55);
      opacity: 0;
      scale: 0.94;
      transition:
        opacity 0.3s var(--ease),
        scale 0.3s var(--ease);
      will-change: transform;
    }
    .preview.on {
      opacity: 1;
      scale: 1;
    }
  `,
})
export class CinemaCanvas {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly labelEls = viewChildren<ElementRef<HTMLElement>>('label');
  private readonly previewEl = viewChild<ElementRef<HTMLImageElement>>('preview');

  private readonly hover = inject(ProjectHover).hovered;
  private readonly content = inject(LanguageService).content;
  private readonly scene = signal<SceneHandle | null>(null);
  /** Client-only: floating previews only make sense with a mouse. */
  private readonly finePointer = signal(false);

  protected readonly labels = LAYER_LABELS;
  protected readonly labelsOn = computed(() => this.hover() === 'almeida');
  /** Images that failed to load stay hidden (the previews are optional decoration). */
  private readonly failed = signal<ReadonlySet<string>>(new Set());
  /** Last previewed project stays mounted so the image can fade out. */
  private readonly lastPreviewId = signal<'climb' | 'continuar' | null>(null);
  protected readonly preview = computed(() => {
    const id = this.lastPreviewId();
    if (!id || !this.finePointer()) return undefined;
    return this.content().projects.items.find((p) => p.id === id)?.preview;
  });
  protected readonly previewOn = computed(() => {
    const pv = this.preview();
    const hovered = this.hover();
    return !!pv && (hovered === 'climb' || hovered === 'continuar') && !this.failed().has(pv.src);
  });

  constructor() {
    const doc = inject(DOCUMENT);
    const win = doc.defaultView;
    const display = inject(DisplayMode);
    const director = inject(ScrollDirector);
    const loadThree = inject(THREE_LOADER);
    const loadScene = inject(CINEMA_SCENE_LOADER);
    const pages = inject(PageService);
    const teardown: (() => void)[] = [];
    let destroyed = false;

    effect(() => {
      const id = this.hover();
      if (id === 'climb' || id === 'continuar') this.lastPreviewId.set(id);
    });
    effect(() => {
      const on = this.labelsOn();
      this.scene()?.setLayerLabels(on);
    });

    const shutdown = (): void => {
      teardown.splice(0).forEach((off) => off());
      this.scene()?.dispose();
      this.scene.set(null);
    };
    const fail = (reason: string, error?: unknown): void => {
      if (destroyed) return;
      if (error !== undefined) console.warn(error);
      shutdown();
      display.fallbackToStatic(reason);
    };

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      shutdown();
    });

    afterNextRender(async () => {
      if (!win) return;
      this.finePointer.set(win.matchMedia?.(FINE_POINTER_QUERY).matches ?? false);
      const canvas = this.canvas().nativeElement;

      let scene: SceneHandle;
      try {
        const [three, createScene] = await Promise.all([loadThree(), loadScene()]);
        if (destroyed) return;
        scene = createScene(canvas, {
          mobile: win.matchMedia?.(MOBILE_QUERY).matches ?? false,
          shapes: pages.page(),
          three,
        });
      } catch (error) {
        fail('cinema: 3D scene unavailable, using the static layout', error);
        return;
      }
      this.scene.set(scene);

      const listen = (target: EventTarget, type: string, handler: (e: Event) => void): void => {
        target.addEventListener(type, handler, { passive: true });
        teardown.push(() => target.removeEventListener(type, handler));
      };

      // Pointer: tilts the scene and leads the floating preview.
      let px = win.innerWidth / 2;
      let py = win.innerHeight / 2;
      let iy = py;
      listen(doc, 'pointermove', (e) => {
        const { clientX, clientY } = e as PointerEvent;
        px = clientX;
        py = clientY;
        scene.setPointer((px / win.innerWidth) * 2 - 1, (py / win.innerHeight) * 2 - 1);
      });

      // Right edge of the project list, measured on resize (not per frame); null when absent.
      let listRight: number | null = null;
      const measureList = (): void => {
        const list = doc.querySelector('#projects .list');
        listRight = list ? list.getBoundingClientRect().right : null;
      };
      const resize = (): void => {
        scene.resize(win.innerWidth, win.innerHeight);
        measureList();
      };
      listen(win, 'resize', resize);
      resize();

      listen(canvas, 'webglcontextlost', () => fail('cinema: WebGL context lost, using the static layout'));

      const start = performance.now();
      let labelsUntil = 0;
      const offFrame = director.onFrame((p) => {
        const now = performance.now();
        scene.setProgress(p);
        scene.render((now - start) / 1000);
        if (this.labelsOn()) labelsUntil = now + LABEL_FADE_MS;
        if (now < labelsUntil) this.placeLabels(scene);
        const img = this.previewEl()?.nativeElement;
        const pv = this.preview();
        if (img && pv) {
          iy += (py - iy) * PREVIEW_LERP;
          const h = (PREVIEW_WIDTH * pv.height) / pv.width;
          if (listRight === null) measureList();
          const pos = previewPosition(listRight, iy, h, { width: win.innerWidth, height: win.innerHeight });
          img.style.visibility = pos ? 'visible' : 'hidden';
          if (pos) img.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        } else {
          iy = py;
        }
      });
      teardown.push(offFrame);
    });
  }

  protected markFailed(src: string): void {
    this.failed.update((s) => new Set(s).add(src));
  }

  private placeLabels(scene: SceneHandle): void {
    const els = this.labelEls();
    if (!els.length) return;
    scene.getLayerAnchors().forEach((a, i) => {
      const el = els[i]?.nativeElement;
      if (el) el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
    });
  }
}
