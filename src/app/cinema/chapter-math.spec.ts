import { describe, expect, it } from 'vitest';
import {
  chapterFill,
  chapterScrollTop,
  isChapterActive,
  nearestChapter,
  ratioToProgress,
  staticProgress,
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

  describe('staticProgress', () => {
    // five 1000px chapters stacked from the top of the page, scrolled by `y`
    const boxes = (y: number) => [0, 1, 2, 3, 4].map((i) => ({ top: i * 1000 - y, height: 1000 }));

    it('is the chapter index when that chapter is centred on the line', () => {
      expect(staticProgress(boxes(0), 500)).toBe(0);
      expect(staticProgress(boxes(2000), 500)).toBe(2);
    });

    it('moves linearly between neighbours', () => {
      expect(staticProgress(boxes(1500), 500)).toBeCloseTo(1.5);
    });

    it('clamps to 0..4 and survives empty input', () => {
      expect(staticProgress(boxes(-800), 500)).toBe(0);
      expect(staticProgress(boxes(9000), 500)).toBe(4);
      expect(staticProgress([], 500)).toBe(0);
    });
  });
});
