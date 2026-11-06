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

export const CINEMA_SCREEN = '(min-width: 861px) and (hover: hover) and (pointer: fine)';

export function hasWebGL(doc: Document): boolean {
  const canvas = doc.createElement('canvas');
  return (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) !== null;
}

/**
 * Cinema mode needs a desktop screen and a drawing context: WebGL, or Canvas 2D when WebGL is
 * missing. Keep in sync with the inline script in index.html.
 */
export function supportsCinema(win: Window): boolean {
  // Desktop only: on phones and tablets the pinned 620vh scroll and the WebGL scene feel sluggish
  // under touch, so they get the static layout with native scrolling (and never load three.js).
  if (!win.matchMedia(CINEMA_SCREEN).matches) return false;
  return hasWebGL(win.document) || win.document.createElement('canvas').getContext('2d') !== null;
}

/**
 * Static layout: shape progress from the chapters' boxes (viewport px) and a reading line.
 * Equals `i` while chapter `i` is centred on the line and moves linearly between neighbours,
 * so the background morphs in step with native scrolling. Clamped to 0..CHAPTER_COUNT-1.
 */
export function staticProgress(
  boxes: readonly { top: number; height: number }[],
  line: number,
): number {
  if (!boxes.length) return 0;
  let p = 0;
  boxes.forEach((box, i) => {
    if (box.height > 0 && box.top <= line) p = i + (line - box.top) / box.height - 0.5;
  });
  return clamp(p, 0, CHAPTER_COUNT - 1);
}
