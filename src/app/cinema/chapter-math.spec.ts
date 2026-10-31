import { describe, expect, it } from 'vitest';
import {
  chapterFill,
  chapterScrollTop,
  isChapterActive,
  nearestChapter,
  ratioToProgress,
} from './chapter-math';

describe('chapter-math', () => {
  it('ratioToProgress clamps and scales', () => {
    expect(ratioToProgress(-1)).toBe(0);
    expect(ratioToProgress(0.5)).toBe(2);
    expect(ratioToProgress(2)).toBe(4);
  });

  it('isChapterActive uses the 0.34 window', () => {
    expect(isChapterActive(1.33, 1)).toBe(true);
    expect(isChapterActive(1.35, 1)).toBe(false);
  });

  it('nearestChapter rounds and clamps', () => {
    expect(nearestChapter(2.49)).toBe(2);
    expect(nearestChapter(9)).toBe(4);
    expect(nearestChapter(-3)).toBe(0);
  });

  it('chapterFill', () => {
    expect(chapterFill(1, 1)).toBe(0.5);
    expect(chapterFill(3, 1)).toBe(1);
    expect(chapterFill(0, 2)).toBe(0);
  });

  it('chapterScrollTop depends only on the given maxScroll (resize-safe)', () => {
    expect(chapterScrollTop(2, 4000)).toBe(2000);
    expect(chapterScrollTop(2, 3000)).toBe(1500);
  });
});
