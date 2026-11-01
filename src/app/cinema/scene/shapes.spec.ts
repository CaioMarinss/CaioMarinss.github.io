import { describe, expect, it } from 'vitest';
import { LAYER_Y, generateShapes } from './shapes';

describe('generateShapes', () => {
  const COUNT = 1000;
  const { shapes, rnd } = generateShapes(COUNT, 1);

  it('returns five xyz arrays and one random value per particle in [0, 1)', () => {
    expect(shapes).toHaveLength(5);
    shapes.forEach((s) => expect(s).toHaveLength(COUNT * 3));
    expect(rnd).toHaveLength(COUNT);
    rnd.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  it('keeps every coordinate finite and inside |v| <= 3.5', () => {
    shapes.forEach((s) =>
      s.forEach((v) => {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(3.5);
      }),
    );
  });

  it('is deterministic for the same seed and differs for another one', () => {
    const again = generateShapes(COUNT, 1);
    again.shapes.forEach((s, k) => expect(Array.from(s)).toEqual(Array.from(shapes[k])));
    expect(Array.from(again.rnd)).toEqual(Array.from(rnd));
    expect(Array.from(generateShapes(COUNT, 2).rnd)).not.toEqual(Array.from(rnd));
  });

  it('puts at least 85% of the layered shape on the three layers', () => {
    expect(LAYER_Y).toEqual([1.15, 0, -1.15]);
    const layered = shapes[2];
    let onLayer = 0;
    for (let i = 0; i < COUNT; i++) {
      const y = layered[i * 3 + 1];
      if (LAYER_Y.some((l) => Math.abs(y - l) <= 0.02)) onLayer++;
    }
    expect(onLayer / COUNT).toBeGreaterThanOrEqual(0.85);
  });

  it('builds the </> opening, wider than tall (details in shapes-code.spec)', () => {
    const code = shapes[0];
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < COUNT; i++) {
      maxX = Math.max(maxX, Math.abs(code[i * 3]));
      maxY = Math.max(maxY, Math.abs(code[i * 3 + 1]));
    }
    expect(maxX).toBeGreaterThan(maxY);
  });
});
