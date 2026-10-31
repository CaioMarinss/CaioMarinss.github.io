import type * as THREE from 'three';
import { BG_FRAGMENT, BG_VERTEX, PARTICLE_FRAGMENT, PARTICLE_VERTEX } from './shaders';
import { LAYER_Y, SHAPE_COUNT, generateShapes } from './shapes';

export type ThreeModule = typeof THREE;

export interface CinemaSceneOptions {
  /** ≤ 860px: fewer particles, lower DPR cap, centred framing. */
  readonly mobile: boolean;
  /** The `three` module, injected so the dynamic import lives in one place (and tests can fake it). */
  readonly three: ThreeModule;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** Prototype constants. */
const PARTICLES = { desktop: 9000, mobile: 5000 } as const;
const MAX_DPR = { desktop: 2, mobile: 1.5 } as const;
const POINT_SIZE = { desktop: 42, mobile: 34 } as const;
const SHAPE_SEED = 20251031;
const POINTER_LERP = 0.05;
const LAYERS_LERP = 0.08;
const MOBILE_BREAKPOINT = 860;
/** Per-chapter framing: where the object sits (world units) to make room for the text. */
const FRAME_X = { desktop: [1.55, 1.25, 1.35, -1.6, 0], mobile: [0, 0, 0, 0, 0] } as const;
const FRAME_Y = { desktop: [0.05, 0.25, -0.25, 0, 0.15], mobile: [0.9, 0.9, 0.9, 0.7, 0.35] } as const;

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
  };

  private compact: boolean;
  private width = 1;
  private height = 1;
  private p = 0;
  private tmx = 0;
  private tmy = 0;
  private mx = 0;
  private my = 0;
  private layersTarget = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, opts: CinemaSceneOptions) {
    const T = (this.three = opts.three);
    this.compact = opts.mobile;
    const device = opts.mobile ? 'mobile' : 'desktop';

    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
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
    this.camera.add(bg);

    // Particles: one attribute per target shape, morphed in the vertex shader.
    const { shapes, rnd } = generateShapes(PARTICLES[device], SHAPE_SEED);
    this.geometry = new T.BufferGeometry();
    this.geometry.setAttribute('position', new T.BufferAttribute(shapes[0].slice(), 3));
    for (let k = 0; k < SHAPE_COUNT; k++) this.geometry.setAttribute(`p${k}`, new T.BufferAttribute(shapes[k], 3));
    this.geometry.setAttribute('rnd', new T.BufferAttribute(rnd, 1));
    // Morphed positions leave the shape-0 bounds; skip frustum culling instead of a stale sphere.
    this.pUniforms = {
      uP: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: POINT_SIZE[device] },
      uPR: { value: this.renderer.getPixelRatio() },
      uLayers: { value: 0 },
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
    const P = this.p;
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
    const device = this.compact ? 'mobile' : 'desktop';
    const k = Math.min(Math.floor(P), SHAPE_COUNT - 2);
    const f = P - k;
    const e = f * f * (3 - 2 * f);
    this.pivot.position.x = lerp(FRAME_X[device][k], FRAME_X[device][k + 1], e);
    this.pivot.position.y = lerp(FRAME_Y[device][k], FRAME_Y[device][k + 1], e);
    this.pivot.rotation.y = time * 0.05 + ratio * Math.PI * 1.6 + this.mx * 0.35;
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
