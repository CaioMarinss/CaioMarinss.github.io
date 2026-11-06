import { TestBed } from '@angular/core/testing';
import { Mocked, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CANVAS2D_SCENE_LOADER,
  CINEMA_SCENE_LOADER,
  Canvas2dSceneFactory,
  CinemaCanvas,
  previewPosition,
  SceneHandle,
  THREE_LOADER,
  WEBGL_SUPPORT,
} from './cinema-canvas';
import { DisplayMode } from './display-mode';
import { ProjectHover } from './project-hover';
import { ScrollDirector } from './scroll-director';
import type { ThreeModule } from './scene/cinema-scene';

function fakeScene(): Mocked<SceneHandle> {
  return {
    setProgress: vi.fn<SceneHandle['setProgress']>(),
    setPointer: vi.fn<SceneHandle['setPointer']>(),
    nudge: vi.fn<SceneHandle['nudge']>(),
    setLayerLabels: vi.fn<SceneHandle['setLayerLabels']>(),
    getLayerAnchors: vi.fn<SceneHandle['getLayerAnchors']>(() => [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]),
    resize: vi.fn<SceneHandle['resize']>(),
    render: vi.fn<SceneHandle['render']>(),
    dispose: vi.fn<SceneHandle['dispose']>(),
  };
}

/** Frame subscriber registered through the fake ScrollDirector (null once unsubscribed). */
let frame: ((p: number) => void) | null = null;
const fakeDirector: Pick<ScrollDirector, 'onFrame'> = {
  onFrame: (cb) => {
    frame = cb;
    return () => {
      if (frame === cb) frame = null;
    };
  },
};

interface MountOptions {
  webgl?: boolean;
  canvas2d?: () => Promise<Canvas2dSceneFactory>;
}

/** Lets the afterNextRender hook run and the (fake) dynamic import settle. */
async function mount(
  loader: () => Promise<ThreeModule>,
  factory: () => SceneHandle,
  {
    webgl = true,
    canvas2d = () => Promise.reject(new Error('2d chunk failed')),
  }: MountOptions = {},
) {
  TestBed.configureTestingModule({
    providers: [
      { provide: THREE_LOADER, useValue: loader },
      { provide: CINEMA_SCENE_LOADER, useValue: () => Promise.resolve(factory) },
      { provide: CANVAS2D_SCENE_LOADER, useValue: canvas2d },
      { provide: WEBGL_SUPPORT, useValue: () => webgl },
      { provide: ScrollDirector, useValue: fakeDirector },
    ],
  });
  const fixture = TestBed.createComponent(CinemaCanvas);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  return fixture;
}

describe('CinemaCanvas', () => {
  beforeEach(() => {
    frame = null;
    document.documentElement.classList.add('is-cinema');
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    document.documentElement.classList.remove('is-cinema');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the WebGL scene when WebGL is available, without loading the 2D scene', async () => {
    const canvas2d = vi.fn(() => Promise.resolve(fakeScene));
    const fixture = await mount(() => Promise.resolve({} as ThreeModule), fakeScene, { canvas2d });

    expect(TestBed.inject(DisplayMode).mode()).toBe('cinema');
    expect((fixture.nativeElement as HTMLElement).dataset['renderer']).toBe('webgl');
    expect(canvas2d).not.toHaveBeenCalled();
  });

  it('uses the Canvas 2D scene without WebGL, never loading three', async () => {
    const loader = vi.fn(() => Promise.resolve({} as ThreeModule));
    const scene = fakeScene();
    const create = vi.fn<Canvas2dSceneFactory>(() => scene);
    const fixture = await mount(loader, fakeScene, {
      webgl: false,
      canvas2d: () => Promise.resolve(create),
    });

    expect(TestBed.inject(DisplayMode).mode()).toBe('cinema');
    expect((fixture.nativeElement as HTMLElement).dataset['renderer']).toBe('canvas2d');
    expect(loader).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({ mobile: false }),
    );
    frame!(1);
    expect(scene.render).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Canvas 2D scene when the WebGL scene throws', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => {
        throw new Error('no webgl');
      },
      { canvas2d: () => Promise.resolve(() => scene) },
    );

    expect(TestBed.inject(DisplayMode).mode()).toBe('cinema');
    expect((fixture.nativeElement as HTMLElement).dataset['renderer']).toBe('canvas2d');
  });

  it('falls back to static when the 2D scene reports it is too slow', async () => {
    const scene = fakeScene();
    let tooSlow: (() => void) | undefined;
    await mount(() => Promise.resolve({} as ThreeModule), fakeScene, {
      webgl: false,
      canvas2d: () =>
        Promise.resolve((_canvas, opts) => {
          tooSlow = opts.onTooSlow;
          return scene;
        }),
    });

    tooSlow!();

    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
    expect(scene.dispose).toHaveBeenCalled();
  });

  it('falls back to static when no scene can be created', async () => {
    await mount(() => Promise.resolve({} as ThreeModule), fakeScene, { webgl: false });

    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
  });

  it('falls back to static when the three chunk fails to load', async () => {
    const factory = vi.fn(fakeScene);
    await mount(() => Promise.reject(new Error('chunk failed')), factory);

    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
    expect(factory).not.toHaveBeenCalled();
  });

  it('falls back to static when the scene constructor throws', async () => {
    await mount(
      () => Promise.resolve({} as ThreeModule),
      () => {
        throw new Error('no webgl');
      },
    );

    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
  });

  it('falls back to static and disposes the scene when the WebGL context is lost', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );
    expect(TestBed.inject(DisplayMode).mode()).toBe('cinema');
    expect(scene.resize).toHaveBeenCalled();

    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    canvas.dispatchEvent(new Event('webglcontextlost'));

    expect(TestBed.inject(DisplayMode).mode()).toBe('static');
    expect(scene.dispose).toHaveBeenCalled();
  });

  it('shows the layer labels while Almeida is hovered', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );
    const host = fixture.nativeElement as HTMLElement;

    TestBed.inject(ProjectHover).hovered.set('almeida');
    await fixture.whenStable();

    expect(scene.setLayerLabels).toHaveBeenLastCalledWith(true);
    const labels = host.querySelector('.layers')!;
    expect(labels.classList).toContain('on');
    expect(labels.textContent).toContain('Angular');
    expect(labels.textContent).toContain('Spring Boot + JWT');
    expect(labels.textContent).toContain('MySQL');

    TestBed.inject(ProjectHover).hovered.set(null);
    await fixture.whenStable();
    expect(scene.setLayerLabels).toHaveBeenLastCalledWith(false);
    expect(labels.classList).not.toContain('on');
  });

  it('renders the scene on each director frame', async () => {
    const scene = fakeScene();
    await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );

    frame!(1.5);

    expect(scene.setProgress).toHaveBeenCalledWith(1.5);
    expect(scene.render).toHaveBeenCalledTimes(1);
  });

  it('skips the label anchors while the labels are off', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );

    frame!(2);
    expect(scene.getLayerAnchors).not.toHaveBeenCalled();

    TestBed.inject(ProjectHover).hovered.set('almeida');
    await fixture.whenStable();
    frame!(2);
    expect(scene.getLayerAnchors).toHaveBeenCalledTimes(1);
    const label = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.layers li')!;
    expect(label.style.transform).toBe('translate3d(10px, 20px, 0)');
  });

  it('stops listening after destroy', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );
    fixture.destroy();
    vi.clearAllMocks();

    document.dispatchEvent(new Event('pointermove'));
    window.dispatchEvent(new Event('resize'));

    expect(scene.setPointer).not.toHaveBeenCalled();
    expect(scene.resize).not.toHaveBeenCalled();
    expect(frame).toBeNull();
  });

  it('disposes the scene on destroy', async () => {
    const scene = fakeScene();
    const fixture = await mount(
      () => Promise.resolve({} as ThreeModule),
      () => scene,
    );
    fixture.destroy();
    expect(scene.dispose).toHaveBeenCalled();
  });
});

describe('previewPosition', () => {
  const vp = { width: 1440, height: 900 };
  it('sits to the right of the list, never over it', () => {
    expect(previewPosition(720, 500, 175, vp)?.x).toBe(744);
  });
  it('follows the pointer vertically, centred', () => {
    expect(previewPosition(720, 500, 175, vp)?.y).toBeCloseTo(412.5);
  });
  it('stays below the header and inside the viewport', () => {
    expect(previewPosition(720, 0, 175, vp)?.y).toBe(88);
    expect(previewPosition(720, 900, 175, vp)?.y).toBe(900 - 175 - 16);
  });
  it('is hidden when there is no free column right of the list', () => {
    expect(previewPosition(1200, 400, 175, vp)).toBeNull();
  });
  it('is hidden on mobile-width viewports and without a list', () => {
    expect(previewPosition(300, 400, 175, { width: 860, height: 900 })).toBeNull();
    expect(previewPosition(null, 400, 175, vp)).toBeNull();
  });
});
