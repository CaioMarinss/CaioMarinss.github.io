/**
 * Particle target shapes, one per chapter, ported from the approved prototype. Plain math without
 * Three.js so it is testable and stays out of the lazy chunk's critical path. A seeded PRNG
 * replaces Math.random to make the output deterministic.
 */

import {
  SHAPE_COUNT,
  createBallSampler,
  mulberry32,
  type ShapeSet,
  type ShapeSetId,
  type Vec3,
} from './shape-core';
import { generateLifeShapes } from './shapes-life';

export { SHAPE_COUNT, createBallSampler, mulberry32 };
export type { ShapeSet, ShapeSetId, Vec3 };

/** Heights of the three layers of shape 2 (front / API / database). */
export const LAYER_Y = [1.15, 0, -1.15] as const;

/** Network hubs and the edges linking them (shape 1). */
const HUBS: readonly Vec3[] = [
  [-2.1, 0.9, 0],
  [-1.2, -1.1, 0.6],
  [0, 0.2, -0.4],
  [1.3, 1.2, 0.3],
  [2.2, -0.5, -0.2],
  [0.6, -1.5, 0.8],
  [-0.4, 1.7, 0.9],
  [1.6, 0.1, 1.2],
  [-2.3, -0.6, -0.9],
];
const EDGES: readonly (readonly [number, number])[] = [
  [0, 2], [1, 2], [2, 3], [3, 4], [2, 5], [4, 5], [0, 6],
  [6, 3], [3, 7], [4, 7], [0, 8], [8, 1], [1, 5], [6, 2],
];

/**
 * The "</>" of the opening (shape 0) as segments in the xy plane: "<" (two), "/" and ">" (two). The
 * approved preview's layout at 0.8 scale, so the ">" stays on screen at 4:3, in half-screen windows
 * and on tall narrow phones with the home's fixed framing (half-width ≈ 1.71 with the thickness).
 */
export const CODE_STROKES: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [[-0.92, 0.76], [-1.64, 0]],
  [[-1.64, 0], [-0.92, -0.76]],
  [[-0.336, -0.92], [0.336, 0.92]],
  [[0.92, 0.76], [1.64, 0]],
  [[1.64, 0], [0.92, -0.76]],
];
/** Glyph of each stroke: 0 "<", 1 "/", 2 ">". */
export const CODE_GLYPH_OF_STROKE: readonly (0 | 1 | 2)[] = [0, 0, 1, 2, 2];
/** Half the stroke thickness, and half the depth (z) that gives the "</>" some volume as it turns. */
export const CODE_HALF_THICKNESS = 0.1;
export const CODE_DEPTH = 0.17;

const CODE_LENGTHS = CODE_STROKES.map(([[ax, ay], [bx, by]]) => Math.hypot(bx - ax, by - ay));
const CODE_TOTAL = CODE_LENGTHS.reduce((sum, length) => sum + length, 0);
/** Seeds the side PRNG of the "</>", so shape 0 still takes exactly one value from the shared stream. */
const CODE_SEED_SALT = 0x3c2f3e;

/**
 * A point of the "</>": `u` in [0, 1) picks the spot along the strokes (by length, so each glyph gets a
 * fair share), `side` spreads it across the stroke and in depth. Points next to the origin are redrawn,
 * so the morph's burst (along the point's direction) always has a direction.
 */
function codePoint(u: number, side: () => number): Vec3 {
  let along = u * CODE_TOTAL;
  let k = 0;
  while (k < CODE_STROKES.length - 1 && along > CODE_LENGTHS[k]) {
    along -= CODE_LENGTHS[k];
    k++;
  }
  const [[ax, ay], [bx, by]] = CODE_STROKES[k];
  const t = Math.min(along / CODE_LENGTHS[k], 1);
  const nx = -(by - ay) / CODE_LENGTHS[k];
  const ny = (bx - ax) / CODE_LENGTHS[k];
  for (;;) {
    const w = (side() * 2 - 1) * CODE_HALF_THICKNESS;
    const z = (side() * 2 - 1) * CODE_DEPTH;
    const x = ax + (bx - ax) * t + nx * w;
    const y = ay + (by - ay) * t + ny * w;
    if (Math.hypot(x, y, z) > 0.05) return [x, y, z];
  }
}

export function generateShapes(count: number, seed: number, set: ShapeSetId = 'home'): ShapeSet {
  if (set === 'life') return generateLifeShapes(count, seed);
  const random = mulberry32(seed);
  const shapes = Array.from({ length: SHAPE_COUNT }, () => new Float32Array(count * 3));
  const rnd = new Float32Array(count);

  const randIn = createBallSampler(random);
  const codeRandom = mulberry32((seed ^ CODE_SEED_SALT) >>> 0);

  for (let i = 0; i < count; i++) {
    rnd[i] = random();
    const o = i * 3;
    const r = random();

    // 0 — opening "</>" (programming): one value from the shared stream, as the former sphere took
    shapes[0].set(codePoint(random(), codeRandom), o);

    // 1 — integration network: 38% around hubs, the rest along edges
    if (r < 0.38) {
      const h = HUBS[i % HUBS.length];
      const d = randIn(0.2);
      shapes[1].set([h[0] + d[0], h[1] + d[1], h[2] + d[2]], o);
    } else {
      const [ai, bi] = EDGES[i % EDGES.length];
      const a = HUBS[ai];
      const b = HUBS[bi];
      const t = random();
      const d = randIn(0.025);
      shapes[1].set(
        [a[0] + (b[0] - a[0]) * t + d[0], a[1] + (b[1] - a[1]) * t + d[1], a[2] + (b[2] - a[2]) * t + d[2]],
        o,
      );
    }

    // 2 — layered architecture: front / api / db planes, 10% in connecting columns
    {
      const L = i % 3;
      const y = LAYER_Y[L];
      if (random() < 0.9) {
        shapes[2].set([(random() - 0.5) * 3.4, y + (random() - 0.5) * 0.03, (random() - 0.5) * 2.0], o);
      } else {
        const cx = [-1, 0, 1][L] * 1.1;
        const cz = [-0.5, 0.5, 0][L];
        shapes[2].set([cx + (random() - 0.5) * 0.04, 1.15 - random() * 2.3, cz + (random() - 0.5) * 0.04], o);
      }
    }

    // 3 — stage: floor ring r ≈ 2.3 at y = -1.3 + spotlight cone of height 3.1
    if (r < 0.55) {
      const a = random() * Math.PI * 2;
      const rr = 2.3 + (random() - 0.5) * 0.1;
      shapes[3].set([Math.cos(a) * rr, -1.3 + (random() - 0.5) * 0.04, Math.sin(a) * rr], o);
    } else {
      const h = random();
      const a = random() * Math.PI * 2;
      const rr = (1 - h) * 1.3 * Math.sqrt(random());
      shapes[3].set([Math.cos(a) * rr, -1.3 + h * 3.1, Math.sin(a) * rr], o);
    }

    // 4 — open three-arm spiral (reaching out)
    {
      const arm = i % 3;
      const t = random();
      const a = t * 7 + arm * 2.094;
      const rr = 0.25 + t * 2.8;
      shapes[4].set(
        [
          Math.cos(a) * rr + (random() - 0.5) * 0.18 * t,
          (random() - 0.5) * 0.25 * (1 - t * 0.5),
          Math.sin(a) * rr + (random() - 0.5) * 0.18 * t,
        ],
        o,
      );
    }
  }

  return { shapes, rnd, orbit: new Float32Array(count * 4) };
}
