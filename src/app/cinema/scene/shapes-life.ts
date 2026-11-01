import { SHAPE_COUNT, createBallSampler, mulberry32, type ShapeSet, type Vec3 } from './shape-core';

/** Number of orbiting clusters in the opening shape. */
export const ORBIT_COUNT = 4;
/** Radius of every cluster's orbit circle. */
export const ORBIT_RADIUS = 1.9;

/** Tilt of each orbit plane about the X axis (rad). */
const TILTS = [0.4, -0.5, 1.1, -0.2] as const;
/** Initial phase of each cluster along its circle (rad). */
const PHASES = [0, 1.2, 2.1, 3.3] as const;

/** Music shape: number of strings, radius of the circle they stand on and half their length. */
export const STRING_COUNT = 6;
export const STRING_RADIUS = 0.65;
export const STRING_HALF = 1.5;

const TAU = Math.PI * 2;

/**
 * Target shapes for the life page. Shape 0 is the orbiting opening: a still core plus ORBIT_COUNT
 * clusters, each on its own tilted circle. The orbit array carries (axis, speed) so the vertex
 * shader can rotate each particle around its axis (Rodrigues). The axis is the unit normal of the
 * orbit plane, chosen so a positive speed advances the phase angle. Trail particles (25% of each
 * cluster, spread along the full circle) share their cluster's axis and speed, so they orbit too
 * and stay on the same circle.
 */
export function generateLifeShapes(count: number, seed: number): ShapeSet {
  const random = mulberry32(seed);
  const randIn = createBallSampler(random);
  const shapes = Array.from({ length: SHAPE_COUNT }, () => new Float32Array(count * 3));
  const rnd = new Float32Array(count);
  const orbit = new Float32Array(count * 4);

  const circle = (k: number, a: number): [number, number, number] => {
    const t = TILTS[k];
    return [Math.cos(a) * ORBIT_RADIUS, Math.sin(a) * ORBIT_RADIUS * Math.sin(t), Math.sin(a) * ORBIT_RADIUS * Math.cos(t)];
  };

  for (let i = 0; i < count; i++) {
    rnd[i] = random();
    const o = i * 3;

    // 0 - orbits: still core (20%) and four clusters on tilted circles
    if (i % 5 === 0) {
      const d = randIn(0.45);
      shapes[0].set(d, o);
    } else {
      const k = i % ORBIT_COUNT;
      const t = TILTS[k];
      const trail = random() < 0.25;
      const c = circle(k, trail ? random() * TAU : PHASES[k]);
      const d = trail ? ([0, 0, 0] as const) : randIn(0.28);
      shapes[0].set([c[0] + d[0], c[1] + d[1], c[2] + d[2]], o);
      // normal of the plane spanned by (1,0,0) and (0,sin t,cos t); rotating about it advances the angle
      orbit.set([0, -Math.cos(t), Math.sin(t), 0.5 + (k + 1) * 0.12], i * 4);
    }

    // 1 - jiu-jitsu belt: a flat band wrapped around the waist, a square knot in front and two
    // tails hanging from it, each ending in its rank bar
    {
      // built with the knot at +z, then turned so the knot faces the camera around this chapter
      const [x, y, z] = beltPoint(i, random);
      shapes[1].set([x * BELT_COS + z * BELT_SIN, y, -x * BELT_SIN + z * BELT_COS], o);
    }

    // 2 - strings: six vertical plucked strings standing on a circle. The scene spins about Y, so a
    // flat row of strings would go edge-on and collapse into one streak; vertical lines on a circle
    // keep their full length and stay apart from every angle.
    {
      const s = i % STRING_COUNT;
      const a = (s / STRING_COUNT) * TAU + 0.26;
      const t = random();
      const y = (t * 2 - 1) * STRING_HALF;
      // standing wave: still at both ends, widest mid-string, a different phase per string
      const w = Math.sin(Math.PI * t) * Math.sin(t * 3 * Math.PI + s) * 0.1;
      shapes[2].set(
        [
          Math.cos(a) * STRING_RADIUS - Math.sin(a) * w + (random() - 0.5) * 0.03,
          y,
          Math.sin(a) * STRING_RADIUS + Math.cos(a) * w + (random() - 0.5) * 0.03,
        ],
        o,
      );
    }

    // 3 - crosshair: two rings (r 0.7 and 1.25) and four radial ticks from 0.35 to 1.6
    {
      const r = random();
      const a = random() * TAU;
      if (r < 0.3) {
        shapes[3].set([Math.cos(a) * 0.7, Math.sin(a) * 0.7, (random() - 0.5) * 0.04], o);
      } else if (r < 0.7) {
        shapes[3].set([Math.cos(a) * 1.25, Math.sin(a) * 1.25, (random() - 0.5) * 0.04], o);
      } else {
        const ang = (i % 4) * (Math.PI / 2);
        const d = 0.35 + random() * 1.25;
        shapes[3].set([Math.cos(ang) * d + (random() - 0.5) * 0.03, Math.sin(ang) * d + (random() - 0.5) * 0.03, (random() - 0.5) * 0.04], o);
      }
    }

    // 4 - kart circuit: a closed band along a curvy spline, plus a 16-particle start grid
    shapes[4].set(trackPoint(i, random), o);
  }

  return { shapes, rnd, orbit };
}

/** Jiu-jitsu belt: waist ellipse (half width, half depth), band height and the height of its middle. */
export const BELT_WAIST_X = 1.75;
export const BELT_WAIST_Z = 0.75;
export const BELT_WIDTH = 0.36;
export const BELT_Y = 0.75;
/** Tails: length, splay from vertical (rad), and where the rank bar starts and ends along them. */
export const BELT_TAIL_LENGTH = 1.5;
const TAIL_SPLAY = 0.62;
export const BELT_BAR_START = 0.52;
export const BELT_BAR_END = 0.9;
/** Number of stripes (graus) across each rank bar, and their width along the tail (0..1 of its length). */
export const BELT_STRIPES = 3;
const STRIPE_GAP = 0.045;

/** Whether `t` (0..1 along a tail) falls in one of the stripe gaps, spread over the bar's lower 65%. */
export function inStripeGap(t: number): boolean {
  const span = BELT_BAR_END - BELT_BAR_START;
  for (let g = 0; g < BELT_STRIPES; g++) {
    const c = BELT_BAR_START + span * (0.35 + (0.65 * (g + 0.5)) / BELT_STRIPES);
    if (Math.abs(t - c) < STRIPE_GAP / 2) return true;
  }
  return false;
}
/** Knot: half width and half height of the square knot sitting on the front of the band. */
const KNOT_HW = 0.24;
const KNOT_HH = 0.27;
/**
 * The scene's Y spin at the belt chapter is about 0.4 pi plus a slow drift (time * 0.05, ~0.5 rad by
 * the time a reader gets there). Turning the belt by minus that angle brings the knot to the front.
 */
export const BELT_FACING = Math.PI * 0.4 + 0.5;
const BELT_COS = Math.cos(-BELT_FACING);
const BELT_SIN = Math.sin(-BELT_FACING);

const jitter = (random: () => number, a: number): number => (random() - 0.5) * a;

/**
 * One belt particle. 40% on the band around the waist (uniform along the ellipse, a quarter of them
 * on the two edges so the band reads flat and crisp), 15% on the knot, the rest on the two tails:
 * a light plain fill and, near each end, the rank bar as a dense block cut by the graus.
 */
function beltPoint(i: number, random: () => number): Vec3 {
  const r = random();
  if (r < 0.4) {
    // arc-length uniform point on the waist ellipse (rejection on the ellipse speed), skipping the
    // front stretch hidden behind the knot
    let phi = 0;
    for (;;) {
      phi = random() * TAU;
      const speed = Math.hypot(BELT_WAIST_X * Math.sin(phi), BELT_WAIST_Z * Math.cos(phi));
      const front = Math.sin(phi) > 0 && Math.abs(Math.cos(phi) * BELT_WAIST_X) < KNOT_HW * 0.8;
      if (!front && random() * BELT_WAIST_X <= speed) break;
    }
    const edge = random() < 0.25;
    const v = edge ? (random() < 0.5 ? -0.5 : 0.5) + jitter(random, 0.02) : random() - 0.5;
    return [Math.cos(phi) * BELT_WAIST_X, BELT_Y + v * BELT_WIDTH, Math.sin(phi) * BELT_WAIST_Z + jitter(random, 0.02)];
  }
  const zKnot = BELT_WAIST_Z + 0.06;
  if (r < 0.55) {
    // square knot: a filled block with a firm outline and the band crossing it diagonally on top
    const k = random();
    if (k < 0.45) {
      return [(random() * 2 - 1) * KNOT_HW, BELT_Y + (random() * 2 - 1) * KNOT_HH, zKnot + jitter(random, 0.06)];
    }
    if (k < 0.75) {
      const t = random() * 2 - 1;
      const side = Math.floor(random() * 4);
      const x = side < 2 ? t * KNOT_HW : (side === 2 ? -1 : 1) * KNOT_HW;
      const y = side < 2 ? (side === 0 ? -1 : 1) * KNOT_HH : t * KNOT_HH;
      return [x + jitter(random, 0.015), BELT_Y + y + jitter(random, 0.015), zKnot + jitter(random, 0.04)];
    }
    const t = random() * 2 - 1;
    const s = jitter(random, 0.16);
    return [t * KNOT_HW * 1.15 + s * 0.6, BELT_Y - t * KNOT_HH * 1.1 + s, zKnot + 0.07 + jitter(random, 0.03)];
  }
  // tails: hang from under the knot, splayed into an inverted V, flat and as wide as the band
  const side = i % 2 === 0 ? -1 : 1;
  const ang = side * TAIL_SPLAY;
  const dir = [Math.sin(ang), -Math.cos(ang)] as const;
  const across = [Math.cos(ang), Math.sin(ang)] as const;
  const top = [side * KNOT_HW * 0.45, BELT_Y - KNOT_HH * 0.6] as const;
  let t: number;
  let s: number;
  if (random() < 0.42) {
    // plain fill outside the bar, a third of it on the two edges
    const plain = BELT_BAR_START + (1 - BELT_BAR_END);
    const u = random() * plain;
    t = u < BELT_BAR_START ? u : BELT_BAR_END + (u - BELT_BAR_START);
    s = random() < 0.33 ? (random() < 0.5 ? -0.5 : 0.5) + jitter(random, 0.02) : random() - 0.5;
  } else {
    // rank bar: a dense block (much brighter than the tail) cut by the dark gaps of the graus
    for (;;) {
      t = BELT_BAR_START + random() * (BELT_BAR_END - BELT_BAR_START);
      if (!inStripeGap(t)) break;
    }
    s = random() - 0.5;
  }
  const l = t * BELT_TAIL_LENGTH;
  const w = s * BELT_WIDTH;
  return [top[0] + dir[0] * l + across[0] * w, top[1] + dir[1] * l + across[1] * w, zKnot + 0.03 + t * 0.12 + jitter(random, 0.02)];
}

/**
 * Kart circuit control polygon in the XZ plane: the main straight at +z, a hairpin fold on the right,
 * fast sweepers, a chicane on the back straight and a tight infield hairpin on the left.
 */
const TRACK_CONTROL: readonly (readonly [number, number])[] = [
  [-1.4, 1.3], [1.4, 1.3], [2.15, 1.05], [1.95, 0.6], [0.7, 0.6], [0.15, 0.35], [0.45, 0.0], [1.4, -0.05],
  [2.1, -0.4], [2.0, -1.05], [1.3, -1.4], [0.5, -1.3], [-0.1, -1.05], [-0.6, -1.45], [-1.5, -1.5],
  [-2.15, -1.1], [-1.9, -0.55], [-1.05, -0.35], [-0.8, 0.1], [-1.6, 0.35], [-2.2, 0.75], [-2.05, 1.2],
];
/** Width of the track band and the height of its plane. */
export const TRACK_WIDTH = 0.3;
/** Scale applied to TRACK_CONTROL so the circuit stays clear of the copy. */
const TRACK_SCALE = 0.78;
export const TRACK_Y = 0;
const TRACK_SAMPLES = 1024;

/** `n` points along the closed uniform Catmull-Rom spline through TRACK_CONTROL, as (x, z). */
export function trackCenterline(n: number): [number, number][] {
  const m = TRACK_CONTROL.length;
  const pts: [number, number][] = [];
  for (let j = 0; j < n; j++) {
    const u = (j / n) * m;
    const k = Math.floor(u);
    const t = u - k;
    const p0 = TRACK_CONTROL[(k - 1 + m) % m];
    const p1 = TRACK_CONTROL[k];
    const p2 = TRACK_CONTROL[(k + 1) % m];
    const p3 = TRACK_CONTROL[(k + 2) % m];
    const f = (a: number, b: number, c: number, d: number): number =>
      0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    pts.push([f(p0[0], p1[0], p2[0], p3[0]) * TRACK_SCALE, f(p0[1], p1[1], p2[1], p3[1]) * TRACK_SCALE]);
  }
  return pts;
}

/** Centerline polyline with cumulative arc length, for arc-length uniform sampling. */
const TRACK = (() => {
  const pts = trackCenterline(TRACK_SAMPLES);
  const cum = [0];
  for (let j = 1; j <= TRACK_SAMPLES; j++) {
    const a = pts[j - 1];
    const b = pts[j % TRACK_SAMPLES];
    cum.push(cum[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, cum, length: cum[TRACK_SAMPLES] };
})();

/** Point at arc length `d` and across-offset `w` (along the left normal), as xyz on the track plane. */
function onTrack(d: number, w: number): Vec3 {
  let lo = 0;
  let hi = TRACK_SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (TRACK.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = TRACK.pts[lo];
  const b = TRACK.pts[(lo + 1) % TRACK_SAMPLES];
  const seg = TRACK.cum[lo + 1] - TRACK.cum[lo];
  const t = seg > 0 ? (d - TRACK.cum[lo]) / seg : 0;
  const tx = (b[0] - a[0]) / seg;
  const tz = (b[1] - a[1]) / seg;
  return [a[0] + (b[0] - a[0]) * t - tz * w, TRACK_Y, a[1] + (b[1] - a[1]) * t + tx * w];
}

/**
 * One track particle. The first 16 form the start grid: two rows of eight across the main straight.
 * The rest: 78% on the two kerb edges, 22% filling the asphalt between them.
 */
function trackPoint(i: number, random: () => number): Vec3 {
  if (i < 16) {
    const gx = i % 8;
    const gz = Math.floor(i / 8);
    const p = onTrack(TRACK.length * 0.035 + gz * 0.06, ((gx - 3.5) / 3.5) * TRACK_WIDTH * 0.45);
    return [p[0], p[1] + 0.01, p[2]];
  }
  const d = random() * TRACK.length;
  const w = random() < 0.78 ? (random() < 0.5 ? -0.5 : 0.5) + jitter(random, 0.04) : random() - 0.5;
  const p = onTrack(d, w * TRACK_WIDTH);
  return [p[0], p[1] + jitter(random, 0.02), p[2]];
}
