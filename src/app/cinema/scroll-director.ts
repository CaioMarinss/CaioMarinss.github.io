import { DOCUMENT, Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CHAPTER_IDS, ChapterId } from '../content/content.types';
import { chapterScrollTop, isChapterActive, nearestChapter, ratioToProgress } from './chapter-math';
import { DisplayMode } from './display-mode';

/** Smoothing applied per frame to the scroll progress (prototype value). */
const SCROLL_LERP = 0.06;
/** Static mode: a chapter is current while it crosses this fraction of the viewport height. */
const STATIC_READING_LINE = 0.35;

type FrameCallback = (p: number) => void;

const isChapterId = (value: string): value is ChapterId => (CHAPTER_IDS as readonly string[]).includes(value);

/**
 * Drives the page from native scrolling. In cinema mode a rAF loop eases the scroll ratio into
 * chapter progress `p` (0..4), exposes it as `--p` on <html>, toggles `.active` on each
 * `section.ch` and notifies frame subscribers (the 3D scene). In static mode it only tracks the
 * section under the reading line so the menu and language switch stay in sync.
 */
@Injectable({ providedIn: 'root' })
export class ScrollDirector {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly display = inject(DisplayMode);

  private readonly active = signal(0);
  readonly activeChapter: Signal<number> = this.active.asReadonly();

  private readonly callbacks = new Set<FrameCallback>();
  private readonly teardown: (() => void)[] = [];
  private started = false;
  private trackingStatic = false;
  private frameId: number | null = null;
  private p = 0;
  /** Chapter requested by the last goTo, until the eased progress reaches it. */
  private pending: number | null = null;

  onFrame(cb: FrameCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  goTo(index: number, behavior: ScrollBehavior = this.preferredBehavior()): void {
    const win = this.doc.defaultView;
    if (!this.browser || !win) return;
    if (this.isCinema()) {
      this.pending = index;
      win.scrollTo({ top: chapterScrollTop(index, this.maxScroll()), behavior });
    } else {
      this.doc.getElementById(CHAPTER_IDS[index])?.scrollIntoView({ behavior });
    }
  }

  start(): void {
    const win = this.doc.defaultView;
    if (!this.browser || !win || this.started) return;
    this.started = true;

    this.listen(this.doc, 'focusin', (e) => this.onFocusIn(e));

    // Chapter ids are ASCII, so the raw fragment is compared as-is (decoding could throw on malformed input).
    const hash = win.location.hash.slice(1);
    if (isChapterId(hash)) this.goTo(CHAPTER_IDS.indexOf(hash), 'auto');

    if (this.isCinema()) {
      // Start settled on the current scroll position (e.g. after a deep link) instead of easing from 0.
      this.p = ratioToProgress(this.ratio());
      this.listen(this.doc, 'visibilitychange', () => this.schedule());
      this.schedule();
    } else {
      this.trackStatic();
    }
  }

  stop(): void {
    const win = this.doc.defaultView;
    if (this.frameId !== null) win?.cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.teardown.splice(0).forEach((off) => off());
    this.started = false;
    this.trackingStatic = false;
  }

  private readonly frame = (): void => {
    this.frameId = null;
    if (!this.isCinema()) {
      this.leaveCinema();
      return;
    }
    if (this.doc.hidden) return; // resumed by visibilitychange

    const target = ratioToProgress(this.ratio());
    this.p += (target - this.p) * SCROLL_LERP;
    if (Math.abs(target - this.p) < 1e-4) this.p = target;
    const p = this.p;

    this.doc.documentElement.style.setProperty('--p', p.toFixed(4));
    this.doc.querySelectorAll<HTMLElement>('section.ch[data-chapter]').forEach((el) => {
      el.classList.toggle('active', isChapterActive(p, Number(el.dataset['chapter'])));
    });

    const nearest = nearestChapter(p);
    if (nearest !== this.active()) this.active.set(nearest);
    if (nearest === this.pending) this.pending = null;

    this.callbacks.forEach((cb) => cb(p));
    this.schedule();
  };

  private schedule(): void {
    const win = this.doc.defaultView;
    if (!win || !this.started || this.frameId !== null || this.doc.hidden) return;
    if (this.trackingStatic) return; // fell back to static: no frame loop anymore
    this.frameId = win.requestAnimationFrame(this.frame);
  }

  /** Display mode fell back to static mid-session (e.g. the 3D chunk failed): drop cinema state. */
  private leaveCinema(): void {
    this.doc.documentElement.style.removeProperty('--p');
    this.doc.querySelectorAll('section.ch.active').forEach((el) => el.classList.remove('active'));
    this.trackStatic();
  }

  private onFocusIn(event: Event): void {
    if (!this.isCinema() || !(event.target instanceof Element)) return;
    const section = event.target.closest<HTMLElement>('section.ch[data-chapter]');
    if (!section) return;
    const index = Number(section.dataset['chapter']);
    if (index !== this.active() && index !== this.pending) this.goTo(index, 'auto');
  }

  private trackStatic(): void {
    const win = this.doc.defaultView;
    if (!win || this.trackingStatic) return;
    this.trackingStatic = true;
    let queued = false;
    const update = (): void => {
      queued = false;
      const line = win.innerHeight * STATIC_READING_LINE;
      this.doc.querySelectorAll<HTMLElement>('section.ch[data-chapter]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) this.active.set(Number(el.dataset['chapter']));
      });
    };
    this.listen(win, 'scroll', () => {
      if (queued) return;
      queued = true;
      win.requestAnimationFrame(update);
    });
    update();
  }

  private ratio(): number {
    const max = this.maxScroll();
    return max > 0 ? (this.doc.defaultView?.scrollY ?? 0) / max : 0;
  }

  private maxScroll(): number {
    const win = this.doc.defaultView;
    const max = this.doc.documentElement.scrollHeight - (win?.innerHeight ?? 0);
    return Number.isFinite(max) && max > 0 ? max : 0;
  }

  private preferredBehavior(): ScrollBehavior {
    const reduce = this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return reduce ? 'auto' : 'smooth';
  }

  private isCinema(): boolean {
    return this.display.mode() === 'cinema';
  }

  private listen(target: EventTarget, type: string, handler: (e: Event) => void): void {
    target.addEventListener(type, handler, { passive: true });
    this.teardown.push(() => target.removeEventListener(type, handler));
  }
}
