import { describe, expect, it } from 'vitest';
import { orbitRotate } from './orbit';

describe('orbitRotate', () => {
  it('is the identity at angle 0, even with a zero axis', () => {
    expect(orbitRotate([1, 2, 3], [0, 0, 0], 0)).toEqual([1, 2, 3]);
    expect(orbitRotate([1, 2, 3], [0, 1, 0], 0)).toEqual([1, 2, 3]);
  });

  it('keeps the distance to the axis', () => {
    const axis: [number, number, number] = [0, 0.6, 0.8];
    const p: [number, number, number] = [1.2, -0.4, 0.9];
    const dist = (v: readonly number[]): number => {
      const along = v[1] * axis[1] + v[2] * axis[2];
      return Math.hypot(v[0], v[1] - along * axis[1], v[2] - along * axis[2]);
    };
    const r = orbitRotate(p, axis, 1.234);
    expect(dist(r)).toBeCloseTo(dist(p), 6);
    expect(Math.hypot(...r)).toBeCloseTo(Math.hypot(...p), 6);
  });

  it('rotates a quarter turn', () => {
    const r = orbitRotate([1, 0, 0], [0, 1, 0], Math.PI / 2);
    expect(r[0]).toBeCloseTo(0, 6);
    expect(r[1]).toBeCloseTo(0, 6);
    expect(r[2]).toBeCloseTo(-1, 6);
  });
});
