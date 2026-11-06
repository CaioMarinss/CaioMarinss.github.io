/**
 * CPU twin of BG_FRAGMENT for the Canvas 2D scene: the same fbm noise sampled on a coarse grid,
 * turned into contour segments by marching squares instead of being shaded per pixel.
 */

export const TOPO_BANDS = 14;

const fract = (v: number): number => v - Math.floor(v);

function hash(x: number, y: number, out: [number, number]): void {
  out[0] = -1 + 2 * fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  out[1] = -1 + 2 * fract(Math.sin(x * 269.5 + y * 183.3) * 43758.5453);
}

const g00: [number, number] = [0, 0];
const g10: [number, number] = [0, 0];
const g01: [number, number] = [0, 0];
const g11: [number, number] = [0, 0];

export function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  hash(ix, iy, g00);
  hash(ix + 1, iy, g10);
  hash(ix, iy + 1, g01);
  hash(ix + 1, iy + 1, g11);
  const a = g00[0] * fx + g00[1] * fy;
  const b = g10[0] * (fx - 1) + g10[1] * fy;
  const c = g01[0] * fx + g01[1] * (fy - 1);
  const d = g11[0] * (fx - 1) + g11[1] * (fy - 1);
  const top = a + (b - a) * ux;
  return top + (c + (d - c) * ux - top) * uy;
}

export function fbm(x: number, y: number): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < 4; i++) {
    s += a * noise(x, y);
    x *= 2.02;
    y *= 2.02;
    a *= 0.5;
  }
  return s;
}

export interface TopoGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  readonly values: Float32Array;
}

export interface TopoInput {
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  readonly time: number;
  readonly p: number;
  readonly mx: number;
  readonly my: number;
}

/** Field value at every grid corner (CSS px, y down), in the shader's uv space. */
export function topoField(
  { width, height, cell, time, p, mx, my }: TopoInput,
  reuse?: TopoGrid,
): TopoGrid {
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  const values =
    reuse && reuse.values.length === cols * rows ? reuse.values : new Float32Array(cols * rows);
  const t = time * 0.025;
  const ox = mx * 0.04;
  const oy = -my * 0.04 + p * 0.22;
  for (let r = 0; r < rows; r++) {
    const qy = ((0.5 * height - r * cell) / height) * 1.35 + oy;
    for (let c = 0; c < cols; c++) {
      const qx = ((c * cell - 0.5 * width) / height) * 1.35 + ox;
      const warp = fbm(qx * 0.7 - t, qy * 0.7 - t) * 0.6;
      values[r * cols + c] = fbm(qx + t + warp, qy - t * 0.6 + warp);
    }
  }
  return { cols, rows, cell, values };
}

/** Iso level of contour `k`: the shader draws a line where fract(f * TOPO_BANDS) = 0.5. */
export const contourLevel = (k: number): number => (k + 0.5) / TOPO_BANDS;

/** Same rule as the shader's `major`: roughly one contour in five is brighter. */
export const isMajor = (k: number): boolean => fract(k * 0.37 + 0.11) >= 0.82;

/** Contour indices crossing the grid's value range. */
export function contourRange(grid: TopoGrid): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of grid.values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [Math.floor(min * TOPO_BANDS - 0.5), Math.ceil(max * TOPO_BANDS - 0.5)];
}

/**
 * Marching squares for one level: calls `emit(x1, y1, x2, y2)` per segment, in CSS px. Saddles are
 * resolved with the cell centre, so lines never cross.
 */
export function contourSegments(
  grid: TopoGrid,
  level: number,
  emit: (x1: number, y1: number, x2: number, y2: number) => void,
): void {
  const { cols, rows, cell, values } = grid;
  const xs = [0, 0, 0, 0];
  const ys = [0, 0, 0, 0];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = values[r * cols + c];
      const b = values[r * cols + c + 1];
      const d = values[(r + 1) * cols + c];
      const e = values[(r + 1) * cols + c + 1];
      const above =
        (a > level ? 1 : 0) + (b > level ? 2 : 0) + (e > level ? 4 : 0) + (d > level ? 8 : 0);
      if (above === 0 || above === 15) continue;
      const x = c * cell;
      const y = r * cell;
      let n = 0;
      const cross = (
        v1: number,
        v2: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
      ): void => {
        if (v1 > level === v2 > level) return;
        const t = (level - v1) / (v2 - v1);
        xs[n] = x1 + (x2 - x1) * t;
        ys[n] = y1 + (y2 - y1) * t;
        n++;
      };
      cross(a, b, x, y, x + cell, y);
      cross(b, e, x + cell, y, x + cell, y + cell);
      cross(d, e, x, y + cell, x + cell, y + cell);
      cross(a, d, x, y, x, y + cell);
      if (n === 2) {
        emit(xs[0], ys[0], xs[1], ys[1]);
      } else if (n === 4) {
        const centreAbove = (a + b + d + e) / 4 > level;
        if (centreAbove === a > level) {
          emit(xs[0], ys[0], xs[1], ys[1]);
          emit(xs[2], ys[2], xs[3], ys[3]);
        } else {
          emit(xs[0], ys[0], xs[3], ys[3]);
          emit(xs[1], ys[1], xs[2], ys[2]);
        }
      }
    }
  }
}
