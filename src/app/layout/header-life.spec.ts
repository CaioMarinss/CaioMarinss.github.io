import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScrollDirector } from '../cinema/scroll-director';
import { CONTENT } from '../content/content';
import { Lang } from '../content/content.types';
import { LanguageService } from '../content/language';
import { PageService } from '../content/page';
import { Header } from './header';

async function renderLifeHeader(lang: Lang, active: number) {
  const director = { activeChapter: signal(active), goTo: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [Header],
    providers: [{ provide: ScrollDirector, useValue: director }],
  }).compileComponents();
  TestBed.inject(LanguageService).setLang(lang);
  TestBed.inject(PageService).setPage('life');
  const fixture = TestBed.createComponent(Header);
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, director };
}

describe('Header on the life page', () => {
  afterEach(() => document.documentElement.classList.remove('is-cinema'));

  it('lists the life chapters with life paths', async () => {
    const { root } = await renderLifeHeader('pt', 0);
    const links = [...root.querySelectorAll('nav a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/sobre/#life-intro',
      '/sobre/#jiujitsu',
      '/sobre/#music',
      '/sobre/#games',
      '/sobre/#kart',
    ]);
    expect(links.map((a) => a.textContent?.trim())).toEqual(Object.values(CONTENT.pt.life.nav));
  });

  it('keeps page and chapter in the language switch', async () => {
    const { root } = await renderLifeHeader('pt', 2);
    expect(root.querySelector('a.lang')?.getAttribute('href')).toBe('/en/about/#music');
  });

  it('brand links back to the home', async () => {
    const pt = await renderLifeHeader('pt', 0);
    expect(pt.root.querySelector('a.brand')?.getAttribute('href')).toBe('/');
    TestBed.resetTestingModule();
    document.documentElement.classList.add('is-cinema');
    const en = await renderLifeHeader('en', 0);
    const brand = en.root.querySelector<HTMLAnchorElement>('a.brand')!;
    expect(brand.getAttribute('href')).toBe('/en/');
    brand.addEventListener('click', (e) => e.preventDefault());
    brand.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(en.director.goTo).not.toHaveBeenCalled();
  });
});
