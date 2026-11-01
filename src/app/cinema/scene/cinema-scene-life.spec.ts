import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CinemaScene, ThreeModule } from './cinema-scene';

/** Stand-in for WebGLRenderer (jsdom has no WebGL); everything else is real three. */
class FakeRenderer {
  static last: FakeRenderer;
  contextLost = false;
  readonly calls: string[] = [];
  constructor() {
    FakeRenderer.last = this;
  }
  setClearColor(): void {}
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

interface Internals {
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
}

function make(opts: { mobile?: boolean; ambient?: boolean; shapes?: 'home' | 'life' }): Internals {
  const scene = new CinemaScene(document.createElement('canvas'), { mobile: false, three, ...opts });
  return scene as unknown as Internals;
}

describe('CinemaScene shape sets', () => {
  it('home scene has a zero orbit attribute and uOrbit 0', () => {
    const { material, geometry } = make({});
    const orbit = geometry.getAttribute('orbit');
    expect(orbit.itemSize).toBe(4);
    expect(orbit.array.every((v) => v === 0)).toBe(true);
    expect(material.uniforms['uOrbit'].value).toBe(0);
  });

  it('life scene uploads life shapes and sets uOrbit 1', () => {
    const home = make({});
    const life = make({ shapes: 'life' });
    expect(life.material.uniforms['uOrbit'].value).toBe(1);
    expect(life.geometry.getAttribute('orbit').array.some((v) => v !== 0)).toBe(true);
    expect(Array.from(life.geometry.getAttribute('p1').array.slice(0, 30))).not.toEqual(
      Array.from(home.geometry.getAttribute('p1').array.slice(0, 30)),
    );
  });

  it('mobile life scene also sets uOrbit 1', () => {
    expect(make({ mobile: true, shapes: 'life' }).material.uniforms['uOrbit'].value).toBe(1);
  });

  it('ambient life scene sets uOrbit 0.6', () => {
    expect(make({ mobile: true, ambient: true, shapes: 'life' }).material.uniforms['uOrbit'].value).toBe(0.6);
  });
});
