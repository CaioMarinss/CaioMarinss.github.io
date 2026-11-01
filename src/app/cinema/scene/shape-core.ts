/** Primitives shared by the shape sets (kept apart so shapes.ts and shapes-life.ts do not import each other). */

export const SHAPE_COUNT = 5;

export type Vec3 = readonly [number, number, number];

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
