import { describe, expect, it } from 'vitest';
import {
  BELT_BAR_END,
  BELT_BAR_START,
  BELT_FACING,
  BELT_STRIPES,
  BELT_WAIST_X,
  BELT_WAIST_Z,
  BELT_WIDTH,
  BELT_Y,
  ORBIT_RADIUS,
  STRING_COUNT,
  STRING_HALF,
  STRING_RADIUS,
  TRACK_WIDTH,
  TRACK_Y,
  generateLifeShapes,
  inStripeGap,
  trackCenterline,
} from './shapes-life';
import { generateShapes } from './shapes';

describe('life shapes', () => {
  const COUNT = 1000;

  it('home set is unchanged and has no orbits', () => {
    const a = generateShapes(COUNT, 1);
    const b = generateShapes(COUNT, 1, 'home');
    b.shapes.forEach((s, k) => expect(Array.from(s)).toEqual(Array.from(a.shapes[k])));
    expect(Array.from(b.rnd)).toEqual(Array.from(a.rnd));
    expect(b.orbit).toHaveLength(COUNT * 4);
    expect(b.orbit.every((v) => v === 0)).toBe(true);
  });

  it('life set has five finite shapes inside 3.5 and is deterministic', () => {
    const a = generateShapes(COUNT, 1, 'life');
    expect(a.shapes).toHaveLength(5);
    a.shapes.forEach((s) => {
      expect(s).toHaveLength(COUNT * 3);
      s.forEach((v) => {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(3.5);
      });
    });
    expect(a.rnd).toHaveLength(COUNT);
    expect(a.orbit).toHaveLength(COUNT * 4);
    const b = generateLifeShapes(COUNT, 1);
    a.shapes.forEach((s, k) => expect(Array.from(s)).toEqual(Array.from(b.shapes[k])));
    expect(Array.from(a.orbit)).toEqual(Array.from(b.orbit));
  });

  it('life opening: core has no orbit, the rest have unit axes and positive speed', () => {
    const { orbit } = generateLifeShapes(COUNT, 1);
    let still = 0;
    for (let i = 0; i < COUNT; i++) {
      const speed = orbit[i * 4 + 3];
      if (speed === 0) {
        still++;
      } else {
        expect(speed).toBeGreaterThan(0);
        expect(Math.hypot(orbit[i * 4], orbit[i * 4 + 1], orbit[i * 4 + 2])).toBeCloseTo(1, 6);
      }
    }
    expect(still / COUNT).toBeGreaterThanOrEqual(0.15);
    expect(still / COUNT).toBeLessThanOrEqual(0.25);
  });

  it('life orbiting particles lie near the orbit radius', () => {
    const { shapes, orbit } = generateLifeShapes(COUNT, 1);
    for (let i = 0; i < COUNT; i++) {
      if (orbit[i * 4 + 3] === 0) continue;
      const d = Math.hypot(shapes[0][i * 3], shapes[0][i * 3 + 1], shapes[0][i * 3 + 2]);
      expect(d).toBeGreaterThanOrEqual(ORBIT_RADIUS - 0.35);
      expect(d).toBeLessThanOrEqual(ORBIT_RADIUS + 0.35);
    }
  });

  it('orbit axis is normal to the particle plane (orbit stays on the circle)', () => {
    const { shapes, orbit } = generateLifeShapes(COUNT, 1);
    for (let i = 0; i < COUNT; i++) {
      if (orbit[i * 4 + 3] === 0) continue;
      const dot = orbit[i * 4] * shapes[0][i * 3] + orbit[i * 4 + 1] * shapes[0][i * 3 + 1] + orbit[i * 4 + 2] * shapes[0][i * 3 + 2];
      expect(Math.abs(dot)).toBeLessThanOrEqual(0.28 + 1e-5);
    }
  });

  it('music strings are vertical lines standing on a circle, so they read from any Y rotation', () => {
    const { shapes } = generateLifeShapes(COUNT, 1);
    const angles = new Set<number>();
    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = [shapes[2][i * 3], shapes[2][i * 3 + 1], shapes[2][i * 3 + 2]];
      expect(Math.abs(y)).toBeLessThanOrEqual(STRING_HALF + 1e-6);
      expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(STRING_RADIUS - 0.15);
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(STRING_RADIUS + 0.15);
      angles.add(Math.round((Math.atan2(z, x) / (Math.PI * 2)) * STRING_COUNT * 2));
    }
    // six strings, evenly spread: their particles cluster around six distinct directions
    expect(angles.size).toBeGreaterThanOrEqual(STRING_COUNT);
  });

  it('crosshair stays compact (radius 1.6 at most) so it fits beside the copy', () => {
    const { shapes } = generateLifeShapes(COUNT, 1);
    for (let i = 0; i < COUNT; i++) {
      expect(Math.hypot(shapes[3][i * 3], shapes[3][i * 3 + 1])).toBeLessThanOrEqual(1.65);
    }
  });

  /** Belt particles turned back to the frame they were built in (knot at +z). */
  const beltPoints = (): [number, number, number][] => {
    const { shapes } = generateLifeShapes(COUNT * 4, 1);
    const c = Math.cos(BELT_FACING);
    const s = Math.sin(BELT_FACING);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < COUNT * 4; i++) {
      const [x, y, z] = [shapes[1][i * 3], shapes[1][i * 3 + 1], shapes[1][i * 3 + 2]];
      pts.push([x * c + z * s, y, -x * s + z * c]);
    }
    return pts;
  };

  it('belt band is a flat, filled band around the waist, as wide as BELT_WIDTH', () => {
    const band = beltPoints().filter(
      ([x, y, z]) => Math.abs(Math.hypot(x / BELT_WAIST_X, z / BELT_WAIST_Z) - 1) < 0.03 && Math.abs(y - BELT_Y) <= BELT_WIDTH / 2 + 0.02,
    );
    expect(band.length / (COUNT * 4)).toBeGreaterThanOrEqual(0.35);
    const ys = band.map(([, y]) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(BELT_WIDTH * 0.95);
    // filled, not just two edge lines: the middle third of the band holds a fair share
    const middle = ys.filter((y) => Math.abs(y - BELT_Y) < BELT_WIDTH / 6).length;
    expect(middle / band.length).toBeGreaterThanOrEqual(0.15);
    // wraps all the way round: particles behind (z < 0) as well as in front, left as well as right
    expect(band.some(([, , z]) => z < -BELT_WAIST_Z * 0.9)).toBe(true);
    expect(band.some(([x]) => x < -BELT_WAIST_X * 0.9)).toBe(true);
    expect(band.some(([x]) => x > BELT_WAIST_X * 0.9)).toBe(true);
  });

  it('belt tails hang below the band in front of the knot, splayed diagonally to both sides', () => {
    const low = beltPoints().filter(([, y]) => y < BELT_Y - BELT_WIDTH / 2 - 0.3);
    expect(low.length / (COUNT * 4)).toBeGreaterThanOrEqual(0.25);
    low.forEach(([, , z]) => expect(z).toBeGreaterThan(BELT_WAIST_Z));
    // the lowest particles sit well out to each side: the tails run diagonally, not straight down
    const minY = Math.min(...low.map(([, y]) => y));
    const tips = low.filter(([, y]) => y < minY + 0.3);
    expect(tips.some(([x]) => x < -0.5)).toBe(true);
    expect(tips.some(([x]) => x > 0.5)).toBe(true);
    expect(tips.every(([x]) => Math.abs(x) > 0.4)).toBe(true);
  });

  it('rank bar sits inside each tail with one gap per grau', () => {
    let gaps = 0;
    let inside = false;
    for (let t = 0; t <= 1; t += 0.001) {
      const g = inStripeGap(t);
      if (g && !inside) {
        gaps++;
        expect(t).toBeGreaterThan(BELT_BAR_START);
        expect(t).toBeLessThan(BELT_BAR_END);
      }
      inside = g;
    }
    expect(gaps).toBe(BELT_STRIPES);
  });

  it('kart track is a closed, curvy circuit: many turns in both directions', () => {
    const n = 2000;
    const pts = trackCenterline(n);
    let total = 0;
    let signChanges = 0;
    let lastSign = 0;
    const heading = (j: number): number => {
      const a = pts[j % n];
      const b = pts[(j + 1) % n];
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    };
    for (let j = 0; j < n; j++) {
      let d = heading(j + 1) - heading(j);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      total += Math.abs(d);
      // count left/right switches between real corners, ignoring the near-straight bits
      if (Math.abs(d) > 0.004) {
        const sign = Math.sign(d);
        if (lastSign !== 0 && sign !== lastSign) signChanges++;
        lastSign = sign;
      }
    }
    // an oval turns 2 pi in one direction; this circuit turns far more and keeps switching sides
    expect(total).toBeGreaterThanOrEqual(5 * Math.PI);
    expect(signChanges).toBeGreaterThanOrEqual(6);
    // closed: the last sample runs into the first
    const gap = Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]);
    expect(gap).toBeLessThan(0.05);
  });

  it('kart particles lie on the flat track band, within half its width of the centerline', () => {
    const { shapes } = generateLifeShapes(COUNT, 1);
    const line = trackCenterline(1500);
    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = [shapes[4][i * 3], shapes[4][i * 3 + 1], shapes[4][i * 3 + 2]];
      expect(Math.abs(y - TRACK_Y)).toBeLessThanOrEqual(0.02);
      const d = Math.min(...line.map(([cx, cz]) => Math.hypot(x - cx, z - cz)));
      expect(d).toBeLessThanOrEqual(TRACK_WIDTH / 2 + 0.03);
    }
  });
});
