import { generateLifeShapes } from './shapes-life';

/**
 * Particle target shapes, one per chapter, ported from the approved prototype. Plain math without
 * Three.js so it is testable and stays out of the lazy chunk's critical path. A seeded PRNG
 * replaces Math.random to make the output deterministic.
 */

export const SHAPE_COUNT = 5;

/** Heights of the three layers of shape 2 (front / API / database). */
export const LAYER_Y = [1.15, 0, -1.15] as const;

export type Vec3 = readonly [number, number, number];

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

/** Deterministic PRNG in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which target-shape set to generate: the home chapters or the life page. */
export type ShapeSetId = 'home' | 'life';

/** Uniform point sampler inside a ball of radius r (prototype `randIn`), drawing from `random`. */
export function createBallSampler(random: () => number): (r: number) => Vec3 {
  return (r) => {
    const z = random() * 2 - 1;
    const phi = random() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    const len = r * Math.cbrt(random());
    return [Math.cos(phi) * s * len, z * len, Math.sin(phi) * s * len];
  };
}

export interface ShapeSet {
  /** SHAPE_COUNT arrays of `count * 3` xyz positions. */
  readonly shapes: Float32Array[];
  /** One random value per particle in [0, 1): per-particle delay, size and alpha. */
  readonly rnd: Float32Array;
  /** `count * 4` values per particle: (axisX, axisY, axisZ, speed rad/s). speed 0 means no orbit. */
  readonly orbit: Float32Array;
}

export function generateShapes(count: number, seed: number, set: ShapeSetId = 'home'): ShapeSet {
  if (set === 'life') return generateLifeShapes(count, seed);
  const random = mulberry32(seed);
  const shapes = Array.from({ length: SHAPE_COUNT }, () => new Float32Array(count * 3));
  const rnd = new Float32Array(count);

  const randIn = createBallSampler(random);

  for (let i = 0; i < count; i++) {
    rnd[i] = random();
    const o = i * 3;
    const r = random();

    // 0 — core sphere (Caio): fibonacci sphere, R ≈ 1.55
    {
      const y = count > 1 ? 1 - (i / (count - 1)) * 2 : 0;
      const rad = Math.sqrt(1 - y * y);
      const th = 2.39996 * i;
      const R = 1.55 + (random() - 0.5) * 0.08;
      shapes[0].set([Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R], o);
    }

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
