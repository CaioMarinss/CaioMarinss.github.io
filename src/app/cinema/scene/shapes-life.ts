import { SHAPE_COUNT, createBallSampler, mulberry32, type ShapeSet } from './shape-core';

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

    // 1 - knotted ribbon: flattened figure-eight loop with two tails hanging 1.6 down
    {
      const centerY = 0.5;
      if (random() < 0.7) {
        const u = random() * TAU;
        shapes[1].set(
          [0.85 * Math.sin(u) + (random() - 0.5) * 0.04, centerY + 0.4 * Math.sin(2 * u) + (random() - 0.5) * 0.04, (random() - 0.5) * 0.12],
          o,
        );
      } else {
        const side = i % 2 === 0 ? -1 : 1;
        const t = random();
        shapes[1].set(
          [side * (0.05 + t * 0.45) + (random() - 0.5) * 0.04, centerY - t * 1.6, (random() - 0.5) * 0.1 + side * t * 0.15],
          o,
        );
      }
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

    // 4 - circuit: flattened closed curve with a chicane at y = -0.4, plus a 16-particle start grid
    if (i < 16) {
      const gx = i % 8;
      const gz = Math.floor(i / 8);
      shapes[4].set([2.4 + (gz - 0.5) * 0.16, -0.4, (gx - 3.5) * 0.1], o);
    } else {
      const t = random() * TAU;
      const chicane = 0.35 * Math.sin(3 * t);
      shapes[4].set(
        [Math.cos(t) * 2.4 + (random() - 0.5) * 0.04, -0.4 + (random() - 0.5) * 0.03, Math.sin(t) * (1.3 + chicane) + (random() - 0.5) * 0.04],
        o,
      );
    }
  }

  return { shapes, rnd, orbit };
}
