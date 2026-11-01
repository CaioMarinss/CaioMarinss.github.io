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

    // 4 - kart: the Interlagos circuit as a flat band, plus a 16-particle start grid on the pit straight
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
 * Kart shape: the Interlagos circuit (Autodromo Jose Carlos Pace, Sao Paulo), run anticlockwise.
 * Centerline from the bacinger/f1-circuits GeoJSON (MIT), resampled to 72 evenly spaced points
 * starting on the start line: x east, z south (a north-up map), longest half-extent 2. From index 0:
 * pit straight, S do Senna, Curva do Sol, Reta Oposta, Descida do Lago, Ferradura, Laranjinha,
 * Pinheirinho, Bico de Pato, Mergulho, Juncao and the Subida dos Boxes.
 */
const TRACK_CONTROL: readonly (readonly [number, number])[] = [
  [-1.04, 0.9], [-0.98, 1.12], [-0.92, 1.34], [-0.86, 1.57], [-0.8, 1.79], [-0.71, 2],
  [-0.5, 1.99], [-0.33, 1.85], [-0.12, 1.93], [0.11, 1.99], [0.33, 1.95], [0.52, 1.82],
  [0.65, 1.63], [0.72, 1.41], [0.79, 1.19], [0.84, 0.97], [0.9, 0.74], [0.96, 0.52],
  [1.01, 0.29], [1.07, 0.07], [1.13, -0.16], [1.19, -0.38], [1.25, -0.6], [1.29, -0.83],
  [1.1, -0.95], [0.88, -1], [0.65, -0.99], [0.45, -0.88], [0.3, -0.7], [0.16, -0.51],
  [0.03, -0.33], [-0.11, -0.14], [-0.25, 0.05], [-0.39, 0.23], [-0.59, 0.31], [-0.82, 0.26],
  [-0.97, 0.1], [-1.02, -0.13], [-1.05, -0.36], [-0.92, -0.5], [-0.72, -0.38], [-0.52, -0.47],
  [-0.56, -0.68], [-0.72, -0.84], [-0.85, -1.03], [-0.89, -1.26], [-0.77, -1.39], [-0.61, -1.22],
  [-0.45, -1.05], [-0.24, -0.98], [-0.02, -1.04], [0.14, -1.2], [0.26, -1.4], [0.38, -1.6],
  [0.47, -1.8], [0.28, -1.92], [0.06, -2], [-0.17, -1.99], [-0.39, -1.94], [-0.61, -1.86],
  [-0.81, -1.74], [-0.97, -1.58], [-1.06, -1.36], [-1.11, -1.14], [-1.16, -0.91], [-1.21, -0.69],
  [-1.27, -0.46], [-1.29, -0.23], [-1.26, 0], [-1.2, 0.22], [-1.15, 0.45], [-1.09, 0.67],
];
/** Width of the track band and the height of its plane. */
export const TRACK_WIDTH = 0.1;
export const TRACK_Y = 0;
const TRACK_SAMPLES = 1024;
/**
 * The scene's Y spin at the kart chapter is 1.6 pi plus the slow drift (~1 rad after ~20 s).
 * Turning the circuit by minus that angle shows it as the familiar north-up map when it arrives.
 */
const TRACK_FACING = Math.PI * 1.6 + 1;
const TRACK_COS = Math.cos(-TRACK_FACING);
const TRACK_SIN = Math.sin(-TRACK_FACING);

/** `n` points along the closed uniform Catmull-Rom spline through TRACK_CONTROL, as (x, z), turned to face. */
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
    const x = f(p0[0], p1[0], p2[0], p3[0]);
    const z = f(p0[1], p1[1], p2[1], p3[1]);
    pts.push([x * TRACK_COS + z * TRACK_SIN, -x * TRACK_SIN + z * TRACK_COS]);
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
 * The rest: half on the two kerb edges, half filling the asphalt between them (the band is narrow
 * because the infield sections run close together).
 */
function trackPoint(i: number, random: () => number): Vec3 {
  if (i < 16) {
    const gx = i % 8;
    const gz = Math.floor(i / 8);
    const p = onTrack(TRACK.length * 0.035 + gz * 0.06, ((gx - 3.5) / 3.5) * TRACK_WIDTH * 0.45);
    return [p[0], p[1] + 0.01, p[2]];
  }
  const d = random() * TRACK.length;
  const w = random() < 0.5 ? (random() < 0.5 ? -0.5 : 0.5) + jitter(random, 0.04) : random() - 0.5;
  const p = onTrack(d, w * TRACK_WIDTH);
  return [p[0], p[1] + jitter(random, 0.02), p[2]];
}
