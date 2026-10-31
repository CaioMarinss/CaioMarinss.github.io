import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CinemaScene, ThreeModule } from './cinema-scene';

/** Stand-in for WebGLRenderer (jsdom has no WebGL); everything else is real three. */
class FakeRenderer {
  static last: FakeRenderer;
  contextLost = false;
  readonly calls: string[] = [];
  constructor() {
    FakeRenderer.last = this;
  }
  setPixelRatio(): void {}
  getPixelRatio(): number {
    return 1;
  }
  setSize(): void {}
  render(): void {}
  getContext(): { isContextLost: () => boolean } {
    return { isContextLost: () => this.contextLost };
  }
  forceContextLoss(): void {
    this.calls.push('forceContextLoss');
  }
  dispose(): void {
    this.calls.push('dispose');
  }
}

const three = { ...THREE, WebGLRenderer: FakeRenderer } as unknown as ThreeModule;

function makeScene(): CinemaScene {
  return new CinemaScene(document.createElement('canvas'), { mobile: false, three });
}

describe('CinemaScene', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispose releases geometries, materials and the renderer, forcing the context loss first', () => {
    const geometry = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const material = vi.spyOn(THREE.ShaderMaterial.prototype, 'dispose');
    const scene = makeScene();

    scene.dispose();
    scene.dispose(); // idempotent

    expect(geometry).toHaveBeenCalledTimes(2); // particles + background plane
    expect(material).toHaveBeenCalledTimes(2);
    expect(FakeRenderer.last.calls).toEqual(['forceContextLoss', 'dispose']);
  });

  it('does not force a context loss when the context is already lost', () => {
    const scene = makeScene();
    FakeRenderer.last.contextLost = true;
    scene.dispose();
    expect(FakeRenderer.last.calls).toEqual(['dispose']);
  });

  it('projects the three layer centres to CSS px, top to bottom', () => {
    const scene = makeScene();
    scene.resize(1000, 800);
    scene.setProgress(2);
    scene.render(0);

    const anchors = scene.getLayerAnchors();
    expect(anchors).toHaveLength(3);
    anchors.forEach(({ x, y }) => {
      expect(x).toBeGreaterThan(500); // desktop framing puts the projects shape on the right
      expect(x).toBeLessThan(1000);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(800);
    });
    expect(anchors[0].y).toBeLessThan(anchors[1].y);
    expect(anchors[1].y).toBeLessThan(anchors[2].y);
  });
});
