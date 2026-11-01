import { describe, expect, it } from 'vitest';
import { ORBIT_RADIUS, generateLifeShapes } from './shapes-life';
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
});
