import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  InjectionToken,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { staticProgress } from './chapter-math';
import { CINEMA_SCENE_LOADER, SceneHandle, THREE_LOADER } from './cinema-canvas';

/** Idle time (ms) granted to the first paint before the 3D chunk is requested (0 in tests). */
export const AMBIENT_START_DELAY = new InjectionToken<number>('AMBIENT_START_DELAY', {
  providedIn: 'root',
  factory: () => 900,
});
/** Eases the shape morph so a fast flick doesn't snap the object. */
const PROGRESS_LERP = 0.08;
/** Reading line at 45% of the viewport height (same idea as the static chapter tracking). */
const READING_LINE = 0.45;
/** Canvas opacity: vivid on the opening screen, dimmer behind the reading chapters. */
const OPACITY_OPENING = 1;
const OPACITY_READING = 0.65;
/** Scroll velocity (chapters per frame) → spin impulse (rad/s): a flick gives the object a turn. */
const SPIN_GAIN = 40;
/** Mobile URL bars resize the viewport while scrolling; ignore height changes smaller than this. */
const RESIZE_SLACK_PX = 140;

/**
 * Particle background of the static layout (phones and tablets). Scrolling stays native — the
 * scene only follows it, morphing between the chapter shapes. Lighter than the cinema scene, loaded
 * after the first paint, paused while the tab is hidden, and silently absent when motion is reduced,
 * WebGL is missing or anything fails (the page is complete without it).
 */
@Component({
  selector: 'app-ambient-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<canvas #canvas [class.on]="ready()"></canvas>`,
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
      height: 100lvh;
      opacity: 0;
      transition: opacity 1.2s var(--ease);
    }
    canvas.on {
      opacity: 1;
    }
  `,
})
export class AmbientBackground {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly ready = signal(false);

  constructor() {
    const doc = inject(DOCUMENT);
    const win = doc.defaultView;
    const loadThree = inject(THREE_LOADER);
    const loadScene = inject(CINEMA_SCENE_LOADER);
    const startDelay = inject(AMBIENT_START_DELAY);
    const teardown: (() => void)[] = [];
    let scene: SceneHandle | null = null;
    let destroyed = false;

    const shutdown = (): void => {
      teardown.splice(0).forEach((off) => off());
      scene?.dispose();
      scene = null;
      this.ready.set(false);
    };
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      shutdown();
    });

    afterNextRender(() => {
      if (!win || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const timer = win.setTimeout(() => void boot(), startDelay);
      teardown.push(() => win.clearTimeout(timer));
    });

    const boot = async (): Promise<void> => {
      if (!win) return;
      const canvas = this.canvas().nativeElement;
      try {
        const [three, createScene] = await Promise.all([loadThree(), loadScene()]);
        if (destroyed) return;
        scene = createScene(canvas, { mobile: true, ambient: true, three });
      } catch (error) {
        console.warn('ambient background unavailable', error);
        shutdown();
        return;
      }
      const active = scene;

      const listen = <E extends Event>(target: EventTarget, type: string, handler: (e: E) => void): void => {
        const h = handler as EventListener;
        target.addEventListener(type, h, { passive: true });
        teardown.push(() => target.removeEventListener(type, h));
      };

      // Touch: dragging tilts the object (passive — scrolling is never blocked); release eases back.
      listen<TouchEvent>(doc, 'touchmove', (e) => {
        const t = e.touches[0];
        if (t) active.setPointer((t.clientX / win.innerWidth) * 2 - 1, (t.clientY / win.innerHeight) * 2 - 1);
      });
      listen(doc, 'touchend', () => active.setPointer(0, 0));

      let width = 0;
      let height = 0;
      const resize = (): void => {
        const w = canvas.clientWidth || win.innerWidth;
        const h = canvas.clientHeight || win.innerHeight;
        if (w === width && Math.abs(h - height) < RESIZE_SLACK_PX) return;
        width = w;
        height = h;
        active.resize(w, h);
      };
      listen(win, 'resize', resize);
      resize();

      const chapters = Array.from(doc.querySelectorAll<HTMLElement>('section.ch[data-chapter]'));
      const target = (): number =>
        staticProgress(
          chapters.map((el) => el.getBoundingClientRect()),
          win.innerHeight * READING_LINE,
        );

      let p = target();
      let lastTarget = p;
      let frameId: number | null = null;
      const start = performance.now();
      const frame = (now: number): void => {
        frameId = null;
        if (doc.hidden) return; // resumed by visibilitychange
        schedule();
        const t = target();
        active.nudge((t - lastTarget) * SPIN_GAIN);
        lastTarget = t;
        p += (t - p) * PROGRESS_LERP;
        active.setProgress(p);
        active.render((now - start) / 1000);
        const away = Math.min(Math.max(p / 0.8, 0), 1);
        canvas.style.opacity = this.ready() ? String(OPACITY_OPENING - (OPACITY_OPENING - OPACITY_READING) * away) : '';
      };
      const schedule = (): void => {
        if (frameId === null && !destroyed) frameId = win.requestAnimationFrame(frame);
      };
      teardown.push(() => {
        if (frameId !== null) win.cancelAnimationFrame(frameId);
        frameId = null;
      });
      listen(doc, 'visibilitychange', schedule);
      listen(canvas, 'webglcontextlost', () => shutdown());

      schedule();
      this.ready.set(true);
    };
  }
}
