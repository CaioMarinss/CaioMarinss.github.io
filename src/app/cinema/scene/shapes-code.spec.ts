import { describe, expect, it } from 'vitest';
import { CODE_DEPTH, CODE_GLYPH_OF_STROKE, CODE_HALF_THICKNESS, CODE_STROKES, generateShapes } from './shapes';

/** Closest "</>" stroke to (x, y) and the distance to it. */
function nearestStroke(x: number, y: number): { index: number; distance: number } {
  let best = { index: -1, distance: Infinity };
  CODE_STROKES.forEach(([[ax, ay], [bx, by]], index) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.min(Math.max(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0), 1);
    const distance = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
    if (distance < best.distance) best = { index, distance };
  });
  return best;
}

/** FNV-1a (32 bits) over the raw bytes of the arrays, in order. */
function fnv1a(arrays: readonly Float32Array[]): number {
  let hash = 0x811c9dc5;
  for (const array of arrays) {
    for (const byte of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash;
}

describe('home opening "</>"', () => {
  const COUNT = 1000;
  const { shapes, rnd } = generateShapes(COUNT, 1);

  it('keeps shapes 1-4 and rnd of the home set bit-identical', () => {
    // Pinned from the generator before the opening changed: the "</>" must not shift the shared PRNG.
    expect(fnv1a([shapes[1], shapes[2], shapes[3], shapes[4], rnd])).toBe(2205010531);
  });

  it('puts every particle of shape 0 on the </> strokes', () => {
    const code = shapes[0];
    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = [code[i * 3], code[i * 3 + 1], code[i * 3 + 2]];
      expect(nearestStroke(x, y).distance).toBeLessThanOrEqual(CODE_HALF_THICKNESS + 1e-6);
      expect(Math.abs(z)).toBeLessThanOrEqual(CODE_DEPTH + 1e-6);
      expect(Math.hypot(x, y, z)).toBeGreaterThan(0.05);
    }
  });

  it('gives each glyph a fair share of particles', () => {
    const perGlyph = [0, 0, 0];
    const code = shapes[0];
    for (let i = 0; i < COUNT; i++) perGlyph[CODE_GLYPH_OF_STROKE[nearestStroke(code[i * 3], code[i * 3 + 1]).index]]++;
    perGlyph.forEach((n) => expect(n / COUNT).toBeGreaterThanOrEqual(0.2));
  });

  // Half-width within the spec's ±1.7–2.0 range: wider, the ">" leaves the screen at 4:3 (1024×768),
  // in half-screen windows and on tall narrow phones, where the old sphere (±1.59) still fitted.
  it('keeps the glyph inside the opening frame', () => {
    const code = shapes[0];
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < COUNT; i++) {
      maxX = Math.max(maxX, Math.abs(code[i * 3]));
      maxY = Math.max(maxY, Math.abs(code[i * 3 + 1]));
    }
    expect(maxX).toBeLessThanOrEqual(1.75);
    expect(maxY).toBeLessThanOrEqual(1.05);
  });
});
