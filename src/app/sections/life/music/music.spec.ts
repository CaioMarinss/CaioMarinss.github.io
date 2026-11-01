import { PLATFORM_ID, Provider, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScrollDirector } from '../../../cinema/scroll-director';
import { CONTENT } from '../../../content/content';
import { MusicSection } from './music';

const PLAYLIST = 'https://open.spotify.com/embed/playlist/166KNpL6HlNIQq6TIO8kBa';

/** Minimal IntersectionObserver double: records observed targets and lets the test fire entries. */
class FakeObserver {
  static last: FakeObserver | null = null;
  readonly targets: Element[] = [];
  disconnected = false;
  constructor(
    private readonly cb: (entries: { isIntersecting: boolean }[]) => void,
    readonly options?: { rootMargin?: string },
  ) {
    FakeObserver.last = this;
  }
  observe(el: Element): void {
    this.targets.push(el);
  }
  disconnect(): void {
    this.disconnected = true;
  }
  fire(isIntersecting: boolean): void {
    this.cb([{ isIntersecting }]);
  }
}

async function render(providers: Provider[] = []): Promise<ComponentFixture<MusicSection>> {
  await TestBed.configureTestingModule({ imports: [MusicSection], providers }).compileComponents();
  const fixture = TestBed.createComponent(MusicSection);
  await fixture.whenStable();
  return fixture;
}

const iframe = (f: ComponentFixture<MusicSection>): HTMLIFrameElement | null =>
  (f.nativeElement as HTMLElement).querySelector('#music .player iframe');
const slot = (f: ComponentFixture<MusicSection>): Element | null =>
  (f.nativeElement as HTMLElement).querySelector('#music .player .slot');

function expectPlayer(f: ComponentFixture<MusicSection>): void {
  const el = iframe(f);
  expect(el).not.toBeNull();
  expect(el?.getAttribute('src')).toBe(PLAYLIST);
  expect(el?.getAttribute('loading')).toBe('lazy');
  expect(el?.getAttribute('title')).toBe(CONTENT.pt.life.music.playerTitle);
  expect(el?.getAttribute('height')).toBe('152');
  expect(el?.getAttribute('width')).toBe('100%');
  expect(el?.getAttribute('frameborder')).toBe('0');
  expect(el?.getAttribute('allow')).toBe('encrypted-media');
  expect(slot(f)).toBeNull();
}

describe('MusicSection player deferral', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.documentElement.classList.remove('is-cinema');
    FakeObserver.last = null;
    vi.unstubAllGlobals();
  });

  it('server render: a placeholder with the label, no iframe', async () => {
    const f = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);
    expect(iframe(f)).toBeNull();
    expect(slot(f)).not.toBeNull();
    expect((f.nativeElement as HTMLElement).querySelector('#music .player')?.textContent).toContain(
      CONTENT.pt.life.music.playerLabel,
    );
  });

  it('static: mounts the player once it nears the viewport, then keeps it', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const f = await render();
    expect(iframe(f)).toBeNull();
    expect(slot(f)).not.toBeNull();
    const io = FakeObserver.last;
    expect(io?.targets).toEqual([(f.nativeElement as HTMLElement).querySelector('#music .player')]);

    io?.fire(false);
    await f.whenStable();
    expect(iframe(f)).toBeNull();

    io?.fire(true);
    await f.whenStable();
    expectPlayer(f);
    expect(io?.disconnected).toBe(true);
  });

  it('static without IntersectionObserver: mounts the player after hydration', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const f = await render();
    expectPlayer(f);
  });

  it('cinema: waits until the reader leaves the opening chapter, then keeps the player', async () => {
    document.documentElement.classList.add('is-cinema');
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const active = signal(0);
    const f = await render([{ provide: ScrollDirector, useValue: { activeChapter: active.asReadonly() } }]);
    expect(iframe(f)).toBeNull();
    expect(FakeObserver.last).toBeNull(); // every chapter is "in view" on the fixed stage

    active.set(1);
    await f.whenStable();
    expectPlayer(f);

    active.set(0);
    await f.whenStable();
    expectPlayer(f);
  });
});
