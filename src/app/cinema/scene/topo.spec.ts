import { describe, expect, it } from 'vitest';
import {
  TOPO_BANDS,
  TopoGrid,
  contourLevel,
  contourRange,
  contourSegments,
  isMajor,
  noise,
  topoField,
} from './topo';

function grid(
  cols: number,
  rows: number,
  cell: number,
  at: (c: number, r: number) => number,
): TopoGrid {
  const values = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) values[r * cols + c] = at(c, r);
  return { cols, rows, cell, values };
}

function segments(g: TopoGrid, level: number): number[][] {
  const out: number[][] = [];
  contourSegments(g, level, (...s) => out.push(s));
  return out;
}

describe('topo', () => {
  it('gradient noise is zero on the lattice and varies between it', () => {
    expect(noise(3, -2)).toBeCloseTo(0, 6);
    expect(Math.abs(noise(3.4, -1.7))).toBeGreaterThan(0);
  });

  it('places the shader contours at the middle of each band', () => {
    expect(contourLevel(0)).toBeCloseTo(0.5 / TOPO_BANDS);
    expect(contourLevel(-1)).toBeCloseTo(-0.5 / TOPO_BANDS);
  });

  it('marks majors with the shader rule', () => {
    const majors = Array.from({ length: 20 }, (_, k) => k).filter(isMajor);
    expect(majors.length).toBeGreaterThan(0);
    expect(majors.length).toBeLessThan(8);
    majors.forEach((k) => expect((k * 0.37 + 0.11) % 1).toBeGreaterThanOrEqual(0.82 - 1e-9));
  });

  it('traces a straight line through a linear field, interpolated between grid points', () => {
    const g = grid(5, 4, 10, (c) => c);
    const segs = segments(g, 1.5);
    expect(segs).toHaveLength(3);
    segs.forEach(([x1, , x2]) => {
      expect(x1).toBeCloseTo(15);
      expect(x2).toBeCloseTo(15);
    });
  });

  it('emits nothing for a level outside the field', () => {
    expect(
      segments(
        grid(4, 4, 10, (c, r) => c + r),
        99,
      ),
    ).toEqual([]);
  });

  it('splits a saddle cell into two segments', () => {
    const g = grid(2, 2, 10, (c, r) => (c === r ? 1 : 0));
    expect(segments(g, 0.5)).toHaveLength(2);
  });

  it('covers every contour inside the value range', () => {
    const g = grid(3, 3, 10, (c) => (c - 1) * 0.3);
    const [from, to] = contourRange(g);
    expect(contourLevel(from)).toBeLessThanOrEqual(-0.3);
    expect(contourLevel(to)).toBeGreaterThanOrEqual(0.3);
  });

  it('samples a deterministic field sized to the viewport and reuses its buffer', () => {
    const input = { width: 100, height: 50, cell: 10, time: 3, p: 1, mx: 0.2, my: -0.1 };
    const a = topoField(input);
    expect(a.cols).toBe(11);
    expect(a.rows).toBe(6);
    const values = Array.from(a.values);
    const b = topoField(input, a);
    expect(b.values).toBe(a.values);
    expect(Array.from(b.values)).toEqual(values);
    expect(Array.from(topoField({ ...input, p: 2 }).values)).not.toEqual(values);
  });
});
