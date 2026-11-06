import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplayMode } from './display-mode';
import { readFileSync } from 'node:fs';
import { CINEMA_SCREEN, supportsCinema } from './chapter-math';

function fakeWin(reduced: boolean, ctx: unknown, desktop = true, ctx2d: unknown = ctx): Window {
  const win = {
    matchMedia: (q: string) => ({ matches: q.includes('reduce') ? reduced : desktop }),
    document: {
      createElement: () => ({ getContext: (type: string) => (type === '2d' ? ctx2d : ctx) }),
    },
  };
  return win as unknown as Window;
}

describe('supportsCinema', () => {
  it('ignores reduced motion', () => {
    expect(supportsCinema(fakeWin(true, {}))).toBe(true);
  });
  it('is false without any drawing context', () => {
    expect(supportsCinema(fakeWin(false, null))).toBe(false);
  });
  it('is true without WebGL when Canvas 2D works', () => {
    expect(supportsCinema(fakeWin(false, null, true, {}))).toBe(true);
  });
  it('accepts Canvas 2D in the inline detection script too', () => {
    const html = readFileSync('src/index.html', 'utf8');
    expect(html).toContain(`getContext('2d')`);
  });
  it('is true with a context', () => {
    expect(supportsCinema(fakeWin(false, {}))).toBe(true);
  });
  it('uses the same screen query as the inline detection script in index.html', () => {
    const html = readFileSync('src/index.html', 'utf8');
    expect(html).toContain(`matchMedia('${CINEMA_SCREEN}')`);
  });
  it('is false on touch or narrow screens', () => {
    expect(supportsCinema(fakeWin(false, {}, false))).toBe(false);
  });
});

describe('DisplayMode', () => {
  afterEach(() => {
    document.documentElement.classList.remove('is-cinema');
    document.documentElement.removeAttribute('data-booted');
    vi.restoreAllMocks();
  });

  it('marks the document as booted for the inline safety net', () => {
    TestBed.inject(DisplayMode);
    expect(document.documentElement.hasAttribute('data-booted')).toBe(true);
  });

  it('is static without the class', () => {
    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
  });

  it('reads cinema from the html class and falls back', () => {
    document.documentElement.classList.add('is-cinema');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dm = TestBed.inject(DisplayMode);
    expect(dm.mode()).toBe('cinema');
    dm.fallbackToStatic('x');
    expect(dm.mode()).toBe('static');
    expect(document.documentElement.classList.contains('is-cinema')).toBe(false);
    expect(warn).toHaveBeenCalledWith('x');
  });
});
