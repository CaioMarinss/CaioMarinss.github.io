import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { CONTENT } from '../content/content';
import { LIFE_CHAPTER_IDS, Lang, TitleLine } from '../content/content.types';
import { LanguageService } from '../content/language';
import { PageService } from '../content/page';
import { Life } from './life';

const PLAYLIST = 'https://open.spotify.com/embed/playlist/166KNpL6HlNIQq6TIO8kBa';

async function renderLife(lang: Lang = 'pt'): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [Life],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { lang } } } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Life);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const words = (lines: readonly TitleLine[]): string =>
  lines.map((l) => l.words.map((w) => w.text).join(' ')).join(' ');

describe('Life page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the five life chapters in order', async () => {
    const root = await renderLife();
    const sections = Array.from(root.querySelectorAll('section.ch'));
    expect(sections.map((s) => s.id)).toEqual([...LIFE_CHAPTER_IDS]);
    expect(sections.map((s) => s.getAttribute('data-chapter'))).toEqual(['0', '1', '2', '3', '4']);
    for (const s of sections) {
      expect(s.getAttribute('tabindex')).toBe('-1');
      expect(s.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('has a single h1 "Além do código"', async () => {
    const root = await renderLife();
    const h1s = root.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('Além do código');
    expect(root.querySelector('#life-intro h1')).not.toBeNull();
  });

  it('embeds the playlist with an accessible title once hydrated (deferral: music.spec.ts)', async () => {
    // Without IntersectionObserver the static page mounts the player right after hydration.
    vi.stubGlobal('IntersectionObserver', undefined);
    const iframe = (await renderLife()).querySelector<HTMLIFrameElement>('#music .player iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe(PLAYLIST);
    expect(iframe?.getAttribute('loading')).toBe('lazy');
    expect(iframe?.getAttribute('title')).toBe(CONTENT.pt.life.music.playerTitle);
    expect(iframe?.getAttribute('height')).toBe('152');
    expect(iframe?.getAttribute('width')).toBe('100%');
    expect(iframe?.getAttribute('allow')).toBe('encrypted-media');
    expect(iframe?.getAttribute('frameborder')).toBe('0');
  });

  it('links back to the home in each language', async () => {
    expect((await renderLife('pt')).querySelector('a.back')?.getAttribute('href')).toBe('/');
    TestBed.resetTestingModule();
    const en = await renderLife('en');
    expect(en.querySelector('a.back')?.getAttribute('href')).toBe('/en/');
    expect(en.querySelector('a.back')?.textContent).toContain(CONTENT.en.life.kart.back);
  });

  it('sets page to life and the language from route data', async () => {
    await renderLife('en');
    expect(TestBed.inject(PageService).page()).toBe('life');
    expect(TestBed.inject(LanguageService).lang()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(CONTENT.en.life.meta.title);
  });

  it('shows all copy and the player in static mode', async () => {
    expect(document.documentElement.classList.contains('is-cinema')).toBe(false);
    const root = await renderLife();
    const text = (root.textContent ?? '').replace(/\s+/g, ' ');
    const l = CONTENT.pt.life;
    const copy = [
      l.intro.kicker,
      words(l.intro.title),
      l.intro.lead,
      l.jiujitsu.kicker,
      words(l.jiujitsu.title),
      l.jiujitsu.text,
      ...l.jiujitsu.facts,
      l.music.kicker,
      words(l.music.title),
      l.music.text,
      l.music.playerLabel,
      l.games.kicker,
      words(l.games.title),
      ...l.games.items,
      l.kart.kicker,
      words(l.kart.title),
      l.kart.text,
      l.kart.back,
    ];
    for (const s of copy) {
      expect(text).toContain(s);
    }
    expect(root.querySelector('#music .player')).not.toBeNull();
    expect(root.querySelectorAll('#games li').length).toBe(4);
  });
});

describe('life routes', () => {
  it('resolves sobre and en/about to Life with the right lang', () => {
    const pt = routes.find((r) => r.path === 'sobre');
    const en = routes.find((r) => r.path === 'en/about');
    expect(pt?.component).toBe(Life);
    expect(pt?.data?.['lang']).toBe('pt');
    expect(en?.component).toBe(Life);
    expect(en?.data?.['lang']).toBe('en');
    expect(routes.findIndex((r) => r.path === '**')).toBeGreaterThan(routes.indexOf(en!));
  });
});
