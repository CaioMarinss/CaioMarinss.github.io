import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAPTER_IDS } from '../content/content.types';
import { chapterScrollTop } from './chapter-math';
import { DisplayMode } from './display-mode';
import { ScrollDirector } from './scroll-director';

const SCROLL_HEIGHT = 6000;

/** Pending requestAnimationFrame callbacks; run them with `flushFrame()`. */
let frames: FrameRequestCallback[] = [];
let scrollTo: ReturnType<typeof vi.fn>;
let scrollIntoView: ReturnType<typeof vi.fn>;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

function maxScroll(): number {
  return SCROLL_HEIGHT - window.innerHeight;
}

function flushFrame(): void {
  const pending = frames;
  frames = [];
  pending.forEach((cb) => cb(performance.now()));
}

function setScrollY(y: number): void {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
}

function renderChapters(): void {
  document.body.innerHTML = `<main>${CHAPTER_IDS.map(
    (id, i) => `<section class="ch" id="${id}" data-chapter="${i}"><a href="#x-${i}">link ${i}</a></section>`,
  ).join('')}</main>`;
}

function director(mode: 'cinema' | 'static'): ScrollDirector {
  document.documentElement.classList.toggle('is-cinema', mode === 'cinema');
  return TestBed.inject(ScrollDirector);
}

describe('ScrollDirector', () => {
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView'];
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: SCROLL_HEIGHT });
    setScrollY(0);
    renderChapters();
  });

  afterEach(() => {
    TestBed.inject(ScrollDirector).stop();
    TestBed.resetTestingModule();
    document.documentElement.classList.remove('is-cinema');
    document.documentElement.style.removeProperty('--p');
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
    Reflect.deleteProperty(document, 'hidden');
    if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
    else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('scrolls to the chapter offset in cinema mode', () => {
    director('cinema').goTo(2);
    expect(scrollTo).toHaveBeenCalledWith({ top: chapterScrollTop(2, maxScroll()), behavior: 'smooth' });
  });

  it('uses instant scrolling when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }));
    director('cinema').goTo(3);
    expect(scrollTo).toHaveBeenCalledWith({ top: chapterScrollTop(3, maxScroll()), behavior: 'auto' });
  });

  it('scrolls the section into view in static mode', () => {
    director('static').goTo(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('experience'));
  });

  it('honours a chapter hash on start in static mode', () => {
    history.replaceState(null, '', '/#contact');
    director('static').start();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('contact'));
  });

  it('honours a chapter hash on start in cinema mode', () => {
    history.replaceState(null, '', '/en#projects');
    director('cinema').start();
    expect(scrollTo).toHaveBeenCalledWith({ top: chapterScrollTop(2, maxScroll()), behavior: 'auto' });
  });

  it('survives a malformed hash and still runs the frame loop', () => {
    history.replaceState(null, '', '/#%E0%A4%A');
    const d = director('cinema');
    expect(() => d.start()).not.toThrow();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(frames.length).toBe(1);
    flushFrame();
    expect(document.documentElement.style.getPropertyValue('--p')).toBe('0.0000');
  });

  it('falls back to static mid-session once, without stacking listeners', () => {
    const d = director('cinema');
    d.start();
    flushFrame();
    expect(document.querySelector('section.ch.active')).not.toBeNull();

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const addListener = vi.spyOn(window, 'addEventListener');
    TestBed.inject(DisplayMode).fallbackToStatic('webgl lost');
    flushFrame();

    expect(document.documentElement.style.getPropertyValue('--p')).toBe('');
    expect(document.querySelector('section.ch.active')).toBeNull();
    expect(frames.length).toBe(0);

    for (let k = 0; k < 3; k++) {
      document.dispatchEvent(new Event('visibilitychange'));
      flushFrame();
    }
    expect(frames.length).toBe(0);
    expect(addListener.mock.calls.filter(([type]) => type === 'scroll').length).toBe(1);
  });

  it('ignores hashes that are not chapters', () => {
    history.replaceState(null, '', '/#nope');
    director('static').start();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('brings the chapter of a focused element on stage in cinema mode', () => {
    const d = director('cinema');
    d.start();
    expect(d.activeChapter()).toBe(0);
    document.querySelector<HTMLAnchorElement>('section[data-chapter="2"] a')!.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: chapterScrollTop(2, maxScroll()), behavior: 'auto' });
  });

  it('does not scroll on focus inside the active chapter', () => {
    director('cinema').start();
    document.querySelector('section[data-chapter="0"] a')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not react to focus in static mode', () => {
    director('static').start();
    document.querySelector('section[data-chapter="3"] a')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('writes --p, the active section and activeChapter on each frame', () => {
    setScrollY(maxScroll() / 2);
    const d = director('cinema');
    const seen: number[] = [];
    d.onFrame((p) => seen.push(p));
    d.start();
    flushFrame();

    expect(document.documentElement.style.getPropertyValue('--p')).toBe('2.0000');
    const sections = Array.from(document.querySelectorAll('section.ch'));
    expect(sections.map((s) => s.classList.contains('active'))).toEqual([false, false, true, false, false]);
    expect(d.activeChapter()).toBe(2);
    expect(seen).toEqual([2]);
  });

  it('eases towards the scroll target with a 0.06 lerp', () => {
    const d = director('cinema');
    d.start();
    setScrollY(maxScroll());
    flushFrame();
    expect(document.documentElement.style.getPropertyValue('--p')).toBe('0.2400');
    expect(d.activeChapter()).toBe(0);
  });

  it('treats a page that cannot scroll as chapter 0', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 0 });
    setScrollY(500);
    director('cinema').start();
    flushFrame();
    expect(document.documentElement.style.getPropertyValue('--p')).toBe('0.0000');
  });

  it('pauses while the document is hidden', () => {
    const d = director('cinema');
    const cb = vi.fn();
    d.onFrame(cb);
    d.start();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    flushFrame();
    expect(cb).not.toHaveBeenCalled();
    expect(frames.length).toBe(0);

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    flushFrame();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes frame callbacks and stops the loop', () => {
    const d = director('cinema');
    const cb = vi.fn();
    const off = d.onFrame(cb);
    d.start();
    off();
    flushFrame();
    expect(cb).not.toHaveBeenCalled();

    d.stop();
    flushFrame();
    expect(frames.length).toBe(0);
  });

  it('does not run a frame loop in static mode', () => {
    director('static').start();
    expect(frames.length).toBe(0);
    expect(document.documentElement.style.getPropertyValue('--p')).toBe('');
  });
});
