import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScrollDirector } from '../cinema/scroll-director';
import { CONTENT } from '../content/content';
import { Lang } from '../content/content.types';
import { LanguageService } from '../content/language';
import { Header } from './header';

async function renderHeader(lang: Lang, active: number) {
  const director = { activeChapter: signal(active), goTo: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [Header],
    providers: [{ provide: ScrollDirector, useValue: director }],
  }).compileComponents();
  TestBed.inject(LanguageService).setLang(lang);
  const fixture = TestBed.createComponent(Header);
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, director, fixture };
}

describe('Header', () => {
  afterEach(() => document.documentElement.classList.remove('is-cinema'));

  it('keeps the active chapter in the language switch (pt → en)', async () => {
    const { root } = await renderHeader('pt', 2);
    expect(root.querySelector('a.lang')?.getAttribute('href')).toBe('/en#projects');
  });

  it('points back to portuguese from english', async () => {
    const { root } = await renderHeader('en', 4);
    expect(root.querySelector('a.lang')?.getAttribute('href')).toBe('/#contact');
  });

  it('links to the bare language root on the first chapter', async () => {
    const { root } = await renderHeader('pt', 0);
    expect(root.querySelector('a.lang')?.getAttribute('href')).toBe('/en');
  });

  it('marks only the active chapter with aria-current', async () => {
    const { root, director, fixture } = await renderHeader('pt', 2);
    const current = root.querySelectorAll('nav a[aria-current]');
    expect(current.length).toBe(1);
    expect(current[0].getAttribute('aria-current')).toBe('true');
    expect(current[0].getAttribute('href')).toBe('#projects');
    expect(current[0].textContent?.trim()).toBe(CONTENT.pt.nav.projects);

    director.activeChapter.set(3);
    await fixture.whenStable();
    expect(root.querySelector('nav a[aria-current="true"]')?.getAttribute('href')).toBe('#stage');
  });

  it('hides the decorative progress bar from assistive tech', async () => {
    const { root } = await renderHeader('pt', 0);
    const progress = root.querySelector('.progress');
    expect(progress?.getAttribute('aria-hidden')).toBe('true');
    expect(progress?.querySelectorAll('span').length).toBe(5);
  });

  it('offers the résumé as a download', async () => {
    const { root } = await renderHeader('en', 0);
    const resume = root.querySelector<HTMLAnchorElement>('a.pill');
    expect(resume?.getAttribute('href')).toBe(CONTENT.en.ui.resumeHref);
    expect(resume?.hasAttribute('download')).toBe(true);
  });

  it('routes menu clicks through the director in cinema mode', async () => {
    document.documentElement.classList.add('is-cinema');
    const { root, director } = await renderHeader('pt', 0);
    const link = root.querySelector<HTMLAnchorElement>('nav a[href="#stage"]')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(director.goTo).toHaveBeenCalledWith(3);
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets the browser handle modified and middle clicks in cinema mode', async () => {
    document.documentElement.classList.add('is-cinema');
    const { root, director } = await renderHeader('pt', 0);
    const link = root.querySelector<HTMLAnchorElement>('nav a[href="#stage"]')!;
    link.addEventListener('click', (e) => e.preventDefault()); // keep jsdom from navigating
    const inits: MouseEventInit[] = [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }];
    for (const init of inits) {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
    }
    expect(director.goTo).not.toHaveBeenCalled();
  });

  it('leaves menu clicks to the native anchor jump in static mode', async () => {
    const { root, director } = await renderHeader('pt', 0);
    const link = root.querySelector<HTMLAnchorElement>('nav a[href="#stage"]')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.addEventListener('click', (e) => e.preventDefault()); // keep jsdom from navigating
    link.dispatchEvent(event);
    expect(director.goTo).not.toHaveBeenCalled();
  });
});
