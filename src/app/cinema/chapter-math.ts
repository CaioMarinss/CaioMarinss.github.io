export const CHAPTER_COUNT = 5;
export const ACTIVE_WINDOW = 0.34;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Maps a 0..1 scroll ratio to chapter progress 0..(CHAPTER_COUNT-1). */
export function ratioToProgress(ratio: number): number {
  return clamp(ratio, 0, 1) * (CHAPTER_COUNT - 1);
}

export function isChapterActive(p: number, index: number): boolean {
  return Math.abs(p - index) < ACTIVE_WINDOW;
}

export function nearestChapter(p: number): number {
  return Math.round(clamp(p, 0, CHAPTER_COUNT - 1));
}

/** Scroll offset for a chapter; depends only on the maxScroll passed in. */
export function chapterScrollTop(index: number, maxScroll: number): number {
  return (maxScroll * index) / (CHAPTER_COUNT - 1);
}

export function chapterFill(p: number, index: number): number {
  return clamp(p - index + 0.5, 0, 1);
}

/** Cinema mode needs motion allowed and a WebGL context. Keep in sync with the inline script in index.html. */
export function supportsCinema(win: Window): boolean {
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const canvas = win.document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  return gl !== null;
}
