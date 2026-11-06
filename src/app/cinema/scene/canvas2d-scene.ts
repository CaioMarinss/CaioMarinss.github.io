import {
  CAMERA_FOV,
  CAMERA_Z,
  LAYERS_LERP,
  MOBILE_BREAKPOINT,
  ORBIT_STRENGTH,
  POINTER_LERP,
  Pose,
  SHAPE_SEED,
  SPIN_DAMPING,
  SPIN_MAX,
  framePose,
  lerp,
} from './framing';
import type { ScreenPoint } from './cinema-scene';
import { orbitRotate } from './orbit';
import { LAYER_Y, SHAPE_COUNT, ShapeSetId, generateShapes } from './shapes';
import { TopoGrid, contourLevel, contourRange, contourSegments, isMajor, topoField } from './topo';

export interface Canvas2dSceneOptions {
  readonly mobile: boolean;
  readonly shapes?: ShapeSetId;
  /** Called once when the frame rate stays too low even at the lowest quality. */
  readonly onTooSlow?: () => void;
}

type Device = 'desktop' | 'mobile';

const PARTICLES: Record<Device, number> = { desktop: 4500, mobile: 3000 };
const POINT_SIZE: Record<Device, number> = { desktop: 42, mobile: 34 };
/** Fewer particles than the WebGL scene: slightly bigger and brighter ones keep the same density. */
const SIZE_BOOST = 1.1;
const ALPHA_BOOST = 1.3;
const MAX_DIAMETER = 14;
const SIZE_STEPS_PER_PX = 2;
const SUBPIXEL = 4;
const ACC = [255, 77, 94] as const;
const ACC2 = [255, 158, 204] as const;
const WHITE = [235, 255, 247] as const;
const BG = [7, 4, 5] as const;
const TOPO_CELL = 16;
const TOPO_STEPS = 16;
/** Contour lines are 1px here against the shader's antialiased ~2px: a little more light. */
const LINE_GAIN = 1.6;
/** Quality levels: share of particles drawn and seconds between contour refreshes. */
const QUALITY = [
  { share: 1, topoEvery: 1 / 12 },
  { share: 0.6, topoEvery: 1 / 8 },
  { share: 0.35, topoEvery: 1 / 5 },
] as const;
/** Below ~45 fps the quality drops a level; at the lowest level, below ~24 fps it gives up. */
const DEGRADE_FRAME_S = 1 / 45;
const GIVE_UP_FRAME_S = 1 / 24;
export const SLOW_SAMPLE = 45;

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

const mixRgb = (a: readonly number[], b: readonly number[], t: number): number[] =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t));

interface Kernel {
  readonly r: number;
  readonly w: Float32Array;
}

/**
 * Point-sprite footprints (the shader's smoothstep falloff) per diameter step and subpixel offset,
 * so a particle is a few additions into the frame buffer instead of a drawImage call.
 */
export function buildKernels(): Kernel[] {
  const kernels: Kernel[] = [];
  const sizes = MAX_DIAMETER * SIZE_STEPS_PER_PX;
  for (let si = 0; si <= sizes; si++) {
    const d = Math.max(si / SIZE_STEPS_PER_PX, 0.5);
    const r = Math.ceil(d / 2);
    const side = 2 * r + 1;
    for (let oy = 0; oy < SUBPIXEL; oy++) {
      for (let ox = 0; ox < SUBPIXEL; ox++) {
        const w = new Float32Array(side * side);
        const cx = r + ox / SUBPIXEL;
        const cy = r + oy / SUBPIXEL;
        for (let y = 0; y < side; y++) {
          for (let x = 0; x < side; x++) {
            const a = smoothstep(0.5, 0, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / d);
            w[y * side + x] = a * a * 0.9;
          }
        }
        kernels.push({ r, w });
      }
    }
  }
  return kernels;
}

/**
 * Cinema scene for desktops without WebGL: the same particle morph as CinemaScene, computed on the
 * CPU and splatted into one pixel buffer per frame, over simplified contour lines. Lowers its own quality when
 * the frame rate drops and reports `onTooSlow` if even the lowest level cannot keep up.
 */
export class Canvas2dScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly kernels = buildKernels();
  private frame: ImageData | null = null;
  private bg: Uint8ClampedArray | null = null;
  private base: Uint8ClampedArray | null = null;
  private baseStep = -1;
  private glowMap = new Float32Array(0);
  private vignetteMap = new Float32Array(0);
  private readonly shapes: Float32Array[];
  private readonly rnd: Float32Array;
  private readonly orbit: Float32Array;
  private readonly count: number;
  private readonly shapeSet: ShapeSetId;
  private onTooSlow?: () => void;

  private compact: boolean;
  private width = 1;
  private height = 1;
  private p = 0;
  private tmx = 0;
  private tmy = 0;
  private mx = 0;
  private my = 0;
  private layers = 0;
  private layersTarget = 0;
  private spin = 0;
  private spinAngle = 0;
  private lastTime: number | null = null;
  private pose: Pose = { x: 0, y: 0, rotX: 0, rotY: 0 };
  private grid: TopoGrid | undefined;
  private topoAt = -Infinity;
  private quality = 0;
  private slowSum = 0;
  private slowFrames = 0;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: Canvas2dSceneOptions,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;

    this.compact = opts.mobile;
    this.shapeSet = opts.shapes ?? 'home';
    this.onTooSlow = opts.onTooSlow;
    this.count = PARTICLES[opts.mobile ? 'mobile' : 'desktop'];
    const { shapes, rnd, orbit } = generateShapes(this.count, SHAPE_SEED, this.shapeSet);
    this.shapes = shapes;
    this.rnd = rnd;
    this.orbit = orbit;
  }

  setProgress(p: number): void {
    this.p = Math.min(Math.max(p, 0), SHAPE_COUNT - 1);
  }

  setPointer(x: number, y: number): void {
    this.tmx = x;
    this.tmy = y;
  }

  nudge(velocity: number): void {
    this.spin = Math.min(Math.max(this.spin + velocity, -SPIN_MAX), SPIN_MAX);
  }

  setLayerLabels(on: boolean): void {
    this.layersTarget = on ? 1 : 0;
  }

  getLayerAnchors(): ScreenPoint[] {
    return LAYER_Y.map((y) => {
      const s = this.project(0, y, 0);
      return { x: s.x, y: s.y };
    });
  }

  resize(w: number, h: number): void {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.compact = this.width <= MOBILE_BREAKPOINT;
    this.applySize();
  }

  get qualityLevel(): number {
    return this.quality;
  }

  render(time: number): void {
    if (this.disposed) return;
    const dt = this.lastTime === null ? 0 : time - this.lastTime;
    this.lastTime = time;
    this.trackSpeed(dt);
    const step = Math.min(dt, 0.1);
    this.spinAngle += this.spin * step;
    this.spin *= SPIN_DAMPING;
    this.mx = lerp(this.mx, this.tmx, POINTER_LERP);
    this.my = lerp(this.my, this.tmy, POINTER_LERP);
    this.layers = lerp(this.layers, this.layersTarget, LAYERS_LERP);
    if (Math.abs(this.layers - this.layersTarget) < 1e-3) this.layers = this.layersTarget;

    const device: Device = this.compact ? 'mobile' : 'desktop';
    this.pose = framePose(this.shapeSet, device, this.p, time, this.mx, this.my, this.spinAngle);

    if (time - this.topoAt >= QUALITY[this.quality].topoEvery || time < this.topoAt) {
      this.topoAt = time;
      this.drawTopo(time);
    }
    const frame = this.frame;
    if (!frame || !this.bg) return;
    frame.data.set(this.bg);
    this.drawParticles(frame, time, device);
    this.ctx.putImageData(frame, 0, 0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.frame = null;
    this.bg = this.base = null;
    this.canvas.width = this.canvas.height = 0;
  }

  private applySize(): void {
    const w = Math.round(this.width);
    const h = Math.round(this.height);
    this.canvas.width = w;
    this.canvas.height = h;
    this.frame = this.ctx.createImageData(w, h);
    this.bg = new Uint8ClampedArray(w * h * 4);
    this.base = null;
    this.baseStep = -1;
    this.glowMap = new Float32Array(w * h);
    this.vignetteMap = new Float32Array(w * h);
    const gx = w / 2 + 0.25 * h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ux = (x + 0.5 - w / 2) / h;
        const uy = (y + 0.5 - h / 2) / h;
        this.glowMap[y * w + x] = smoothstep(
          0.65,
          0,
          Math.hypot(x + 0.5 - gx, y + 0.5 - h / 2) / h,
        );
        this.vignetteMap[y * w + x] = 1 - (ux * ux + uy * uy) * 0.35;
      }
    }
    this.topoAt = -Infinity;
  }

  private trackSpeed(dt: number): void {
    if (dt <= 0 || dt > 0.25 || !this.onTooSlow) return;
    this.slowSum += dt;
    this.slowFrames++;
    if (this.slowFrames < SLOW_SAMPLE) return;
    const avg = this.slowSum / this.slowFrames;
    this.slowSum = 0;
    this.slowFrames = 0;
    if (this.quality < QUALITY.length - 1) {
      if (avg > DEGRADE_FRAME_S) this.quality++;
    } else if (avg > GIVE_UP_FRAME_S) {
      const report = this.onTooSlow;
      this.onTooSlow = undefined;
      report();
    }
  }

  private project(x: number, y: number, z: number): { x: number; y: number; depth: number } {
    const { x: px, y: py, rotX, rotY } = this.pose;
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const depth = CAMERA_Z - z2;
    const focal = this.height / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360);
    return {
      x: this.width / 2 + ((x1 + px) * focal) / depth,
      y: this.height / 2 - ((y2 + py) * focal) / depth,
      depth,
    };
  }

  /** Background colour, glow and vignette, rebuilt only when the accent tint moves a step. */
  private ensureBase(step: number): Uint8ClampedArray {
    if (this.base && step === this.baseStep) return this.base;
    const lc = mixRgb(ACC, ACC2, step / TOPO_STEPS);
    const n = this.glowMap.length;
    const base = this.base ?? new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      const g = this.glowMap[i] * 0.018;
      const v = this.vignetteMap[i];
      const q = i * 4;
      base[q] = (BG[0] + lc[0] * g) * v;
      base[q + 1] = (BG[1] + lc[1] * g) * v;
      base[q + 2] = (BG[2] + lc[2] * g) * v;
      base[q + 3] = 255;
    }
    this.base = base;
    this.baseStep = step;
    return base;
  }

  private drawTopo(time: number): void {
    const bg = this.bg;
    if (!bg) return;
    const W = Math.round(this.width);
    const H = Math.round(this.height);
    const step = Math.round(smoothstep(0, 4, this.p) * TOPO_STEPS);
    bg.set(this.ensureBase(step));
    const lc = mixRgb(ACC, ACC2, step / TOPO_STEPS);
    const { glowMap, vignetteMap } = this;

    this.grid = topoField(
      { width: W, height: H, cell: TOPO_CELL, time, p: this.p, mx: this.mx, my: this.my },
      this.grid,
    );
    const [from, to] = contourRange(this.grid);
    for (let k = from; k <= to; k++) {
      const weight = (0.035 + (isMajor(k) ? 0.05 : 0)) * LINE_GAIN;
      contourSegments(this.grid, contourLevel(k), (x1, y1, x2, y2) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const samples = Math.max(1, Math.ceil(len));
        const cover = len / samples;
        for (let s = 0; s < samples; s++) {
          const t = (s + 0.5) / samples;
          const x = x1 + (x2 - x1) * t - 0.5;
          const y = y1 + (y2 - y1) * t - 0.5;
          const ix = Math.floor(x);
          const iy = Math.floor(y);
          if (ix < 0 || iy < 0 || ix >= W - 1 || iy >= H - 1) continue;
          const i = iy * W + ix;
          const a = weight * cover * (0.35 + glowMap[i]) * vignetteMap[i];
          const fx = x - ix;
          const fy = y - iy;
          this.addPixel(bg, i, lc, a * (1 - fx) * (1 - fy));
          this.addPixel(bg, i + 1, lc, a * fx * (1 - fy));
          this.addPixel(bg, i + W, lc, a * (1 - fx) * fy);
          this.addPixel(bg, i + W + 1, lc, a * fx * fy);
        }
      });
    }
  }

  private addPixel(data: Uint8ClampedArray, i: number, rgb: readonly number[], a: number): void {
    const q = i * 4;
    data[q] += rgb[0] * a;
    data[q + 1] += rgb[1] * a;
    data[q + 2] += rgb[2] * a;
  }

  private drawParticles(frame: ImageData, time: number, device: Device): void {
    const { shapes, rnd, orbit, kernels } = this;
    const data = frame.data;
    const W = frame.width;
    const H = frame.height;
    const P = this.p;
    const seg = Math.min(Math.max(P, 0), 3.999);
    const k = Math.floor(seg);
    const frac = seg - k;
    const from = shapes[k];
    const to = shapes[k + 1];
    const orbitStrength = this.shapeSet === 'life' ? ORBIT_STRENGTH[device] : 0;
    const size = POINT_SIZE[device] * SIZE_BOOST;
    const ramp = mixRgb(ACC, ACC2, smoothstep(1, 4, P));
    const boost = (1 + this.layers * 0.6) * ALPHA_BOOST;
    const drawn = Math.round(this.count * QUALITY[this.quality].share);
    const stride = this.count / drawn;

    const { x: px, y: py, rotX, rotY } = this.pose;
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    const focal = this.height / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360);
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const wobX = time * 0.6;
    const wobY = time * 0.5;
    const wobZ = time * 0.4;
    const maxStep = MAX_DIAMETER * SIZE_STEPS_PER_PX;
    const perSize = SUBPIXEL * SUBPIXEL;

    for (let n = 0; n < drawn; n++) {
      const i = Math.floor(n * stride);
      const o = i * 3;
      const r = rnd[i];
      let ax = from[o];
      let ay = from[o + 1];
      let az = from[o + 2];
      const speed = orbit[i * 4 + 3];
      if (k === 0 && orbitStrength && speed) {
        const axis = [orbit[i * 4], orbit[i * 4 + 1], orbit[i * 4 + 2]] as const;
        [ax, ay, az] = orbitRotate([ax, ay, az], axis, time * speed * orbitStrength);
      }
      let f = Math.min(Math.max((frac - 0.25 - r * 0.25) / 0.45, 0), 1);
      f = f * f * (3 - 2 * f);
      let x = ax + (to[o] - ax) * f;
      let y = ay + (to[o + 1] - ay) * f;
      let z = az + (to[o + 2] - az) * f;
      if (f > 0 && f < 1) {
        const burst = Math.sin(f * Math.PI) * (0.35 + r * 0.6);
        const nx = ax + 0.001;
        const ny = ay + 0.001;
        const nz = az + 0.001;
        const scale = burst / Math.hypot(nx, ny, nz);
        x += nx * scale;
        y += ny * scale;
        z += nz * scale;
      }
      x += Math.sin(wobX + r * 40) * 0.025;
      y += Math.cos(wobY + r * 31) * 0.025;
      z += Math.sin(wobZ + r * 17) * 0.025;

      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cx - z1 * sx;
      const depth = CAMERA_Z - (y * sx + z1 * cx);
      if (depth < 0.1) continue;
      const scr = focal / depth;
      const fx = halfW + (x1 + px) * scr;
      const fy = halfH - (y2 + py) * scr;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const step = Math.min(
        maxStep,
        Math.round(((size * (0.35 + r * 0.65)) / depth) * SIZE_STEPS_PER_PX),
      );
      const sub = Math.floor((fy - iy) * SUBPIXEL) * SUBPIXEL + Math.floor((fx - ix) * SUBPIXEL);
      const { r: kr, w } = kernels[step * perSize + sub];
      if (ix + kr < 0 || iy + kr < 0 || ix - kr >= W || iy - kr >= H) continue;

      const alpha = (0.35 + 0.65 * r) * boost;
      const rgb = r >= 0.93 ? WHITE : ramp;
      const cr = rgb[0];
      const cg = rgb[1];
      const cb = rgb[2];
      const side = 2 * kr + 1;
      for (let ky = 0; ky < side; ky++) {
        const yy = iy - kr + ky;
        if (yy < 0 || yy >= H) continue;
        const row = yy * W;
        for (let kx = 0; kx < side; kx++) {
          const xx = ix - kr + kx;
          if (xx < 0 || xx >= W) continue;
          const v = w[ky * side + kx] * alpha;
          if (v <= 0) continue;
          const a = v > 1 ? 1 : v;
          const q = (row + xx) * 4;
          data[q] += cr * a;
          data[q + 1] += cg * a;
          data[q + 2] += cb * a;
        }
      }
    }
  }
}
