import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplayMode } from './display-mode';
import { supportsCinema } from './chapter-math';

function fakeWin(reduced: boolean, ctx: unknown): Window {
  const win = {
    matchMedia: (q: string) => ({ matches: reduced && q.includes('reduce') }),
    document: {
      createElement: () => ({ getContext: () => ctx }),
    },
  };
  return win as unknown as Window;
}

describe('supportsCinema', () => {
  it('is false with reduced motion', () => {
    expect(supportsCinema(fakeWin(true, {}))).toBe(false);
  });
  it('is false without WebGL context', () => {
    expect(supportsCinema(fakeWin(false, null))).toBe(false);
  });
  it('is true with a context', () => {
    expect(supportsCinema(fakeWin(false, {}))).toBe(true);
  });
});

describe('DisplayMode', () => {
  afterEach(() => {
    document.documentElement.classList.remove('is-cinema');
    vi.restoreAllMocks();
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
