import { TestBed } from '@angular/core/testing';
import { Mocked, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AMBIENT_START_DELAY, AmbientBackground } from './ambient-background';
import { CINEMA_SCENE_LOADER, SceneFactory, SceneHandle, THREE_LOADER } from './cinema-canvas';
import { DisplayMode } from './display-mode';
import type { ThreeModule } from './scene/cinema-scene';

function fakeScene(): Mocked<SceneHandle> {
  return {
    setProgress: vi.fn<SceneHandle['setProgress']>(),
    setPointer: vi.fn<SceneHandle['setPointer']>(),
    nudge: vi.fn<SceneHandle['nudge']>(),
    setLayerLabels: vi.fn<SceneHandle['setLayerLabels']>(),
    getLayerAnchors: vi.fn<SceneHandle['getLayerAnchors']>(() => []),
    resize: vi.fn<SceneHandle['resize']>(),
    render: vi.fn<SceneHandle['render']>(),
    dispose: vi.fn<SceneHandle['dispose']>(),
  };
}

let rafQueue: FrameRequestCallback[] = [];
const runFrame = (time: number): void => {
  const queue = rafQueue;
  rafQueue = [];
  queue.forEach((cb) => cb(time));
};

async function mount(loader: () => Promise<ThreeModule>, factory: SceneFactory) {
  TestBed.configureTestingModule({
    providers: [
      { provide: THREE_LOADER, useValue: loader },
      { provide: CINEMA_SCENE_LOADER, useValue: () => Promise.resolve(factory) },
      { provide: AMBIENT_START_DELAY, useValue: 0 },
    ],
  });
  const fixture = TestBed.createComponent(AmbientBackground);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 10)); // start delay + fake imports
  fixture.detectChanges();
  return fixture;
}

describe('AmbientBackground', () => {
  beforeEach(() => {
    rafQueue = [];
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafQueue.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a light ambient scene and renders it from the frame loop', async () => {
    const scene = fakeScene();
    const factory = vi.fn<SceneFactory>(() => scene);
    await mount(() => Promise.resolve({} as ThreeModule), factory);

    expect(factory).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), expect.objectContaining({ ambient: true }));
    runFrame(1000);
    expect(scene.setProgress).toHaveBeenCalled();
    expect(scene.render).toHaveBeenCalledTimes(1);
    expect(scene.nudge).toHaveBeenCalled(); // scroll velocity feeds the spin
  });

  it('stays off when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }));
    const factory = vi.fn<SceneFactory>(fakeScene);
    await mount(() => Promise.resolve({} as ThreeModule), factory);

    expect(factory).not.toHaveBeenCalled();
  });

  it('fails silently without touching the display mode', async () => {
    const fixture = await mount(
      () => Promise.reject(new Error('chunk failed')),
      () => fakeScene(),
    );

    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
    expect(fixture.nativeElement.querySelector('canvas.on')).toBeNull();
  });

  it('disposes the scene when destroyed', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );
    fixture.destroy();
    expect(scene.dispose).toHaveBeenCalled();
  });
});
