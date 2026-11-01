import type * as THREE from 'three';
import { BG_FRAGMENT, BG_VERTEX, PARTICLE_FRAGMENT, PARTICLE_VERTEX } from './shaders';
import { LAYER_Y, SHAPE_COUNT, ShapeSetId, generateShapes } from './shapes';

export type ThreeModule = typeof THREE;

export interface CinemaSceneOptions {
  /** ≤ 860px: fewer particles, lower DPR cap, centred framing. */
  readonly mobile: boolean;
  /**
   * Background of the static layout on phones/tablets: fewer particles, DPR 1, no antialiasing and a
   * centred object, since the copy scrolls over it.
   */
  readonly ambient?: boolean;
  /** Which shape set to draw: the home chapters (default) or the life page. */
  readonly shapes?: ShapeSetId;
  /** The `three` module, injected so the dynamic import lives in one place (and tests can fake it). */
  readonly three: ThreeModule;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** Prototype constants. */
type Profile = 'desktop' | 'mobile' | 'ambient';
const PARTICLES = { desktop: 9000, mobile: 5000, ambient: 3000 } as const;
const MAX_DPR = { desktop: 2, mobile: 1.5, ambient: 1 } as const;
const POINT_SIZE = { desktop: 42, mobile: 34, ambient: 30 } as const;
/** Ambient: a small object near the top of the screen, so the copy below it stays clear. */
const OBJECT_SCALE = { desktop: 1, mobile: 1, ambient: 0.6 } as const;
/** Ambient: size on the opening screen, as a fraction of the full size reached by chapter 1. */
const AMBIENT_SMALL = 0.32;
/** Spin impulse decay per frame (inertia after a flick) and its cap in rad/s. */
const SPIN_DAMPING = 0.92;
const SPIN_MAX = 6;
/** Ambient entrance: the cloud gathers and grows over this many seconds. */
const ENTRANCE_S = 1.6;
const SHAPE_SEED = 20251031;
const POINTER_LERP = 0.05;
const LAYERS_LERP = 0.08;
const MOBILE_BREAKPOINT = 860;
/** Per-chapter framing: where the object sits (world units) to make room for the text. */
const FRAME_X: Record<ShapeSetId, Record<Profile, readonly number[]>> = {
  home: {
    desktop: [1.55, 1.25, 1.35, -1.6, 0],
    mobile: [0, 0, 0, 0, 0],
    ambient: [0.78, 0, 0, 0, 0],
  },
  life: {
    desktop: [1.55, 1.35, 1.75, 1.6, 1.35],
    mobile: [0, 0, 0, 0, 0],
    ambient: [0.78, 0, 0, 0, 0],
  },
};
const FRAME_Y: Record<ShapeSetId, Record<Profile, readonly number[]>> = {
  home: {
    desktop: [0.05, 0.25, -0.25, 0, 0.15],
    mobile: [0.9, 0.9, 0.9, 0.7, 0.35],
    ambient: [1.28, 0, 0, 0, 0.1],
  },
  life: {
    desktop: [0.05, 0.1, 0, 0, 0],
    mobile: [0.9, 0.9, 0.9, 0.7, 0.35],
    ambient: [1.28, 0, 0, 0, 0.1],
  },
};
/** Strength of the life opening's orbiting clusters per device profile; the ambient layer is calmer. */
const ORBIT_STRENGTH = { desktop: 1, mobile: 1, ambient: 0.6 } as const;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * The WebGL scene: a full-screen topographic background plus a particle cloud morphing between one
 * shape per chapter. No Angular and no own loop — the host feeds progress, pointer and time.
 */
export class CinemaScene {
  private readonly three: ThreeModule;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pivot: THREE.Group;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly bgGeometry: THREE.PlaneGeometry;
  private readonly bgMaterial: THREE.ShaderMaterial;
  private readonly bgUniforms: {
    uTime: { value: number };
    uP: { value: number };
    uRes: { value: THREE.Vector2 };
    uMouse: { value: THREE.Vector2 };
  };
  private readonly pUniforms: {
    uP: { value: number };
    uTime: { value: number };
    uSize: { value: number };
    uPR: { value: number };
    uLayers: { value: number };
    uOrbit: { value: number };
  };

  private compact: boolean;
  private readonly ambient: boolean;
  private readonly shapeSet: ShapeSetId;
  private width = 1;
  private height = 1;
  private p = 0;
  private tmx = 0;
  private tmy = 0;
  private mx = 0;
  private my = 0;
  private layersTarget = 0;
  private disposed = false;
  private readonly baseScale: number;
  private spin = 0;
  private spinAngle = 0;
  private lastTime: number | null = null;

  constructor(canvas: HTMLCanvasElement, opts: CinemaSceneOptions) {
    const T = (this.three = opts.three);
    this.compact = opts.mobile;
    this.ambient = opts.ambient ?? false;
    this.shapeSet = opts.shapes ?? 'home';
    const device: Profile = this.ambient ? 'ambient' : opts.mobile ? 'mobile' : 'desktop';

    // Ambient: transparent canvas and no topographic layer — that full-screen noise shader is the
    // main per-pixel cost on phone GPUs; the page's CSS glow shows through instead.
    this.renderer = new T.WebGLRenderer({ canvas, antialias: !this.ambient, alpha: this.ambient });
    if (this.ambient) this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, MAX_DPR[device]));
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);
    this.scene.add(this.camera);

    // Background: topographic contour field, glued to the camera.
    this.bgUniforms = {
      uTime: { value: 0 },
      uP: { value: 0 },
      uRes: { value: new T.Vector2(1, 1) },
      uMouse: { value: new T.Vector2() },
    };
    this.bgGeometry = new T.PlaneGeometry(40, 40);
    this.bgMaterial = new T.ShaderMaterial({
      uniforms: this.bgUniforms,
      depthWrite: false,
      depthTest: false,
      vertexShader: BG_VERTEX,
      fragmentShader: BG_FRAGMENT,
    });
    const bg = new T.Mesh(this.bgGeometry, this.bgMaterial);
    bg.position.z = -12;
    bg.renderOrder = -1;
    if (!this.ambient) this.camera.add(bg);

    // Particles: one attribute per target shape, morphed in the vertex shader.
    const { shapes, rnd, orbit } = generateShapes(PARTICLES[device], SHAPE_SEED, this.shapeSet);
    this.geometry = new T.BufferGeometry();
    this.geometry.setAttribute('position', new T.BufferAttribute(shapes[0].slice(), 3));
    for (let k = 0; k < SHAPE_COUNT; k++) this.geometry.setAttribute(`p${k}`, new T.BufferAttribute(shapes[k], 3));
    this.geometry.setAttribute('rnd', new T.BufferAttribute(rnd, 1));
    this.geometry.setAttribute('orbit', new T.BufferAttribute(orbit, 4));
    // Morphed positions leave the shape-0 bounds; skip frustum culling instead of a stale sphere.
    this.pUniforms = {
      uP: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: POINT_SIZE[device] },
      uPR: { value: this.renderer.getPixelRatio() },
      uLayers: { value: 0 },
      uOrbit: { value: this.shapeSet === 'life' ? ORBIT_STRENGTH[device] : 0 },
    };
    this.material = new T.ShaderMaterial({
      uniforms: this.pUniforms,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
    });
    const points = new T.Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.pivot = new T.Group();
    this.baseScale = OBJECT_SCALE[device];
    this.pivot.scale.setScalar(this.baseScale);
    this.pivot.add(points);
    this.scene.add(this.pivot);
  }

  /** Chapter progress 0..4 (already eased by the ScrollDirector). */
  setProgress(p: number): void {
    this.p = Math.min(Math.max(p, 0), SHAPE_COUNT - 1);
  }

  /** Pointer in normalised viewport coordinates, -1..1 (x right, y down). */
  setPointer(x: number, y: number): void {
    this.tmx = x;
    this.tmy = y;
  }

  /** Adds rotational momentum (rad/s), e.g. from scroll velocity; decays with inertia. */
  nudge(velocity: number): void {
    this.spin = Math.min(Math.max(this.spin + velocity, -SPIN_MAX), SPIN_MAX);
  }

  /** Emphasises the layered shape while the Almeida project is hovered (eased per frame). */
  setLayerLabels(on: boolean): void {
    this.layersTarget = on ? 1 : 0;
  }

  /** Screen positions (CSS px) of the centres of the three layers of shape 2, as of the last render. */
  getLayerAnchors(): ScreenPoint[] {
    // Don't rely on the renderer having refreshed the matrices.
    this.pivot.updateWorldMatrix(true, false);
    this.camera.updateMatrixWorld();
    const v = new this.three.Vector3();
    return LAYER_Y.map((y) => {
      v.set(0, y, 0).applyMatrix4(this.pivot.matrixWorld).project(this.camera);
      return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
    });
  }

  resize(w: number, h: number): void {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.compact = this.width <= MOBILE_BREAKPOINT;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    const pr = this.renderer.getPixelRatio();
    this.bgUniforms.uRes.value.set(this.width * pr, this.height * pr);
  }

  /** Draws one frame; `time` in seconds. */
  render(time: number): void {
    if (this.disposed) return;
    const dt = this.lastTime === null ? 0 : Math.min(time - this.lastTime, 0.1);
    this.lastTime = time;
    this.spinAngle += this.spin * dt;
    this.spin *= SPIN_DAMPING;
    const P = this.p;
    if (this.ambient) {
      // Born from nothing (ease-out cubic), small beside the name on the opening screen, then
      // growing to full size as the reader scrolls into chapter 1.
      const k = Math.min(time / ENTRANCE_S, 1);
      const birth = 1 - (1 - k) ** 3;
      const g = Math.min(Math.max(P, 0), 1);
      const grow = AMBIENT_SMALL + (1 - AMBIENT_SMALL) * g * g * (3 - 2 * g);
      this.pivot.scale.setScalar(this.baseScale * birth * grow);
    }
    const ratio = P / (SHAPE_COUNT - 1);
    this.mx = lerp(this.mx, this.tmx, POINTER_LERP);
    this.my = lerp(this.my, this.tmy, POINTER_LERP);
    const layers = this.pUniforms.uLayers;
    layers.value = lerp(layers.value, this.layersTarget, LAYERS_LERP);
    if (Math.abs(layers.value - this.layersTarget) < 1e-3) layers.value = this.layersTarget;

    this.pUniforms.uP.value = P;
    this.pUniforms.uTime.value = time;
    this.bgUniforms.uP.value = P;
    this.bgUniforms.uTime.value = time;
    this.bgUniforms.uMouse.value.set(this.mx, -this.my);

    // Framing between chapters (smoothstep inside each segment).
    const device: Profile = this.ambient ? 'ambient' : this.compact ? 'mobile' : 'desktop';
    const k = Math.min(Math.floor(P), SHAPE_COUNT - 2);
    const f = P - k;
    const e = f * f * (3 - 2 * f);
    this.pivot.position.x = lerp(FRAME_X[this.shapeSet][device][k], FRAME_X[this.shapeSet][device][k + 1], e);
    this.pivot.position.y = lerp(FRAME_Y[this.shapeSet][device][k], FRAME_Y[this.shapeSet][device][k + 1], e);
    this.pivot.rotation.y = time * 0.05 + ratio * Math.PI * 1.6 + this.mx * 0.35 + this.spinAngle;
    this.pivot.rotation.x = 0.18 + this.my * 0.18 + Math.sin(ratio * Math.PI) * 0.25;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.geometry.dispose();
    this.material.dispose();
    this.bgGeometry.dispose();
    this.bgMaterial.dispose();
    // Free the GPU context right away instead of waiting for GC; pointless if it is already lost.
    if (!this.renderer.getContext().isContextLost()) this.renderer.forceContextLoss();
    this.renderer.dispose();
  }
}
