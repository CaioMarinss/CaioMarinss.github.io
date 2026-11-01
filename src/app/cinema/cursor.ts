import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { ScrollDirector } from './scroll-director';

/** Ring easing towards the pointer per frame (prototype value). */
const RING_LERP = 0.18;
const HIDES_NATIVE = 'has-cursor';

/**
 * Custom cursor: a dot glued to the pointer and a ring that trails it and grows over links and
 * buttons. The parent only creates it in cinema mode on fine-pointer devices, after hydration.
 */
@Component({
  selector: 'app-cursor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<div class="dot" #dot></div><div class="ring" #ring></div>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    :host(.ready) {
      opacity: 1;
    }
    div {
      position: fixed;
      top: 0;
      left: 0;
      border-radius: 50%;
      will-change: transform;
    }
    .dot {
      width: 6px;
      height: 6px;
      margin: -3px 0 0 -3px;
      background: var(--text);
    }
    .ring {
      width: 38px;
      height: 38px;
      margin: -19px 0 0 -19px;
      border: 1px solid rgb(242 245 243 / 0.55);
      transition:
        width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
        height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
        margin 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
        background-color 0.35s,
        border-color 0.35s;
    }
    .ring.hover {
      width: 74px;
      height: 74px;
      margin: -37px 0 0 -37px;
      background: rgb(255 77 94 / 0.08);
      border-color: var(--accent);
    }
  `,
})
export class Cursor {
  private readonly dot = viewChild.required<ElementRef<HTMLElement>>('dot');
  private readonly ring = viewChild.required<ElementRef<HTMLElement>>('ring');

  constructor() {
    const doc = inject(DOCUMENT);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const director = inject(ScrollDirector);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const dot = this.dot().nativeElement;
      const ring = this.ring().nativeElement;
      let x = 0;
      let y = 0;
      let rx = 0;
      let ry = 0;

      const onMove = (e: PointerEvent): void => {
        if (e.pointerType !== 'mouse') return;
        x = e.clientX;
        y = e.clientY;
        if (!host.classList.contains('ready')) {
          rx = x;
          ry = y;
          host.classList.add('ready');
        }
        dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };
      const onOver = (e: Event): void => {
        const target = e.target instanceof Element ? e.target : null;
        // A cross-origin iframe (the Spotify player) swallows pointermove: hide instead of freezing
        // at its edge; the next pointermove on the document shows the cursor again.
        if (target instanceof HTMLIFrameElement) {
          host.classList.remove('ready');
          return;
        }
        ring.classList.toggle('hover', target?.closest('a, button') != null);
      };
      const onLeave = (): void => host.classList.remove('ready');

      doc.documentElement.classList.add(HIDES_NATIVE);
      doc.addEventListener('pointermove', onMove, { passive: true });
      doc.addEventListener('pointerover', onOver, { passive: true });
      doc.documentElement.addEventListener('pointerleave', onLeave);
      const offFrame = director.onFrame(() => {
        rx += (x - rx) * RING_LERP;
        ry += (y - ry) * RING_LERP;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      });

      destroyRef.onDestroy(() => {
        offFrame();
        doc.documentElement.classList.remove(HIDES_NATIVE);
        doc.removeEventListener('pointermove', onMove);
        doc.removeEventListener('pointerover', onOver);
        doc.documentElement.removeEventListener('pointerleave', onLeave);
      });
    });
  }
}
