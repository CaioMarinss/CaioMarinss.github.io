import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas2dScene, SLOW_SAMPLE } from './canvas2d-scene';
import { CinemaScene, ThreeModule } from './cinema-scene';

/** jsdom has no canvas backend: a recording 2D context. */
function fakeContext() {
  return {
    putImageData: vi.fn<(img: ImageData) => void>(),
    createImageData: (width: number, height: number) =>
      ({ width, height, data: new Uint8ClampedArray(width * height * 4) }) as unknown as ImageData,
  };
}

class FakeRenderer {
  setPixelRatio(): void {}
  getPixelRatio(): number {
    return 1;
  }
  setSize(): void {}
  render(): void {}
}

let contexts: ReturnType<typeof fakeContext>[];

function makeScene(opts: Partial<ConstructorParameters<typeof Canvas2dScene>[1]> = {}) {
  const canvas = document.createElement('canvas');
  const scene = new Canvas2dScene(canvas, { mobile: false, ...opts });
  scene.resize(1000, 800);
  return { scene, canvas, main: contexts[0] };
}

/** Renders `frames` frames `dt` seconds apart, starting at `t0`; returns the next time. */
function run(scene: Canvas2dScene, frames: number, dt: number, t0 = 0): number {
  let t = t0;
  for (let i = 0; i < frames; i++, t += dt) scene.render(t);
  return t;
}

describe('Canvas2dScene', () => {
  beforeEach(() => {
    contexts = [];
    const getContext = () => {
      const ctx = fakeContext();
      contexts.push(ctx);
      return ctx;
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      getContext as unknown as HTMLCanvasElement['getContext'],
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('throws without a 2D context so the caller can fall back', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    expect(() => new Canvas2dScene(document.createElement('canvas'), { mobile: false })).toThrow();
  });

  it('projects the layer centres exactly like the WebGL scene', () => {
    const three = { ...THREE, WebGLRenderer: FakeRenderer } as unknown as ThreeModule;
    const gl = new CinemaScene(document.createElement('canvas'), { mobile: false, three });
    const { scene } = makeScene();
    gl.resize(1000, 800);
    for (const s of [gl, scene]) {
      s.setProgress(2);
      s.setPointer(0.3, -0.2);
      s.render(0);
      s.render(4.2);
    }

    const expected = gl.getLayerAnchors();
    scene.getLayerAnchors().forEach((a, i) => {
      expect(a.x).toBeCloseTo(expected[i].x, 3);
      expect(a.y).toBeCloseTo(expected[i].y, 3);
    });
  });

  it('puts one opaque frame per render: dark background, contour lines and bright particles', () => {
    const { scene, main } = makeScene();
    scene.setProgress(1);
    scene.render(0);
    scene.render(1 / 60);

    expect(main.putImageData).toHaveBeenCalledTimes(2);
    const { data } = main.putImageData.mock.calls[1][0];
    let transparent = 0;
    let lit = 0;
    let tinted = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 255) transparent++;
      if (data[i] > 150) lit++;
      else if (data[i] > 12) tinted++;
    }
    expect({ transparent, lit: lit > 1000, tinted: tinted > 1000 }).toEqual({ transparent: 0, lit: true, tinted: true });
  });

  it('keeps full quality at a smooth frame rate', () => {
    const onTooSlow = vi.fn();
    const { scene } = makeScene({ onTooSlow });
    run(scene, 400, 1 / 60);
    expect(scene.qualityLevel).toBe(0);
    expect(onTooSlow).not.toHaveBeenCalled();
  });

  it('lowers quality step by step when frames are slow, then reports once', () => {
    const onTooSlow = vi.fn();
    const { scene } = makeScene({ onTooSlow });
    let t = run(scene, SLOW_SAMPLE + 1, 0.06);
    expect(scene.qualityLevel).toBe(1);
    t = run(scene, SLOW_SAMPLE, 0.06, t);
    expect(scene.qualityLevel).toBe(2);
    expect(onTooSlow).not.toHaveBeenCalled();
    run(scene, SLOW_SAMPLE * 6, 0.06, t);
    expect(onTooSlow).toHaveBeenCalledTimes(1);
  });

  it('keeps animating at the lowest quality when around 30 fps', () => {
    const onTooSlow = vi.fn();
    const { scene } = makeScene({ onTooSlow });
    run(scene, SLOW_SAMPLE * 8, 1 / 30);
    expect(scene.qualityLevel).toBe(2);
    expect(onTooSlow).not.toHaveBeenCalled();
  });

  it('ignores the gap after the tab was hidden', () => {
    const onTooSlow = vi.fn();
    const { scene } = makeScene({ onTooSlow });
    const t = run(scene, 50, 1 / 60);
    run(scene, 300, 1 / 60, t + 30);
    expect(scene.qualityLevel).toBe(0);
  });

  it('stops drawing after dispose', () => {
    const { scene, main, canvas } = makeScene();
    scene.dispose();
    scene.dispose();
    scene.render(1);
    expect(main.putImageData).not.toHaveBeenCalled();
    expect(canvas.width).toBe(0);
  });
});
