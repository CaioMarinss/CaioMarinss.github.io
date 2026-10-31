import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { CHAPTER_IDS, ProjectItem, TitleLine } from '../content/content.types';
import { CONTENT } from '../content/content';
import { Home } from '../pages/home';
import { ProjectsSection } from './projects/projects';
import { TitleWords } from './title-words';

async function renderHome(lang: 'pt' | 'en' = 'pt'): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [Home],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { lang } } } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Home);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('sections (static mode)', () => {
  it('renders one section.ch per chapter, in order', async () => {
    const root = await renderHome();
    const sections = Array.from(root.querySelectorAll('section.ch'));
    expect(sections.map((s) => s.id)).toEqual([...CHAPTER_IDS]);
    expect(sections.map((s) => s.getAttribute('data-chapter'))).toEqual(['0', '1', '2', '3', '4']);
  });

  it('has a single h1 with the name and an h2 for every other chapter', async () => {
    const root = await renderHome();
    const h1s = root.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('Caio Marins');
    expect(root.querySelectorAll('section.ch h2').length).toBe(4);
  });

  it('renders the english content on /en', async () => {
    const root = await renderHome('en');
    expect(root.textContent).toContain(CONTENT.en.intro.kicker);
    expect(root.querySelector('#projects h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('From front to database');
  });

  it('gives the portrait explicit size, srcset and high priority', async () => {
    const img = (await renderHome()).querySelector<HTMLImageElement>('#intro img');
    const photo = CONTENT.pt.intro.photo;
    expect(img?.getAttribute('width')).toBe(String(photo.width));
    expect(img?.getAttribute('height')).toBe(String(photo.height));
    expect(img?.getAttribute('srcset')).toBe(photo.srcset);
    expect(img?.getAttribute('fetchpriority')).toBe('high');
    expect(img?.getAttribute('alt')).toBe(photo.alt);
  });

  it('shows no screenshot for Almeida and the award for Climb', async () => {
    const root = await renderHome();
    expect(root.querySelector('[data-project="almeida"] img')).toBeNull();
    const climb = CONTENT.pt.projects.items.find((p) => p.id === 'climb');
    expect(climb?.award).toBeTruthy();
    expect(root.querySelector('[data-project="climb"]')?.textContent).toContain(climb?.award);
    expect(root.querySelector('[data-project="almeida"]')?.textContent).not.toContain('Top TCC');
  });

  it('opens every external link safely', async () => {
    const links = Array.from((await renderHome()).querySelectorAll<HTMLAnchorElement>('a[href^="http"]'));
    expect(links.length).toBeGreaterThan(5);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener');
    }
  });

  it('keeps the full text of every chapter in the DOM', async () => {
    const text = (await renderHome()).textContent ?? '';
    const c = CONTENT.pt;
    for (const s of [
      c.intro.paragraphs[1],
      c.experience.paragraph,
      c.experience.ladder[1].role,
      c.projects.items[2].summary,
      c.stage.events[1].meta,
      c.contact.facts[0],
      c.contact.links[1].label,
    ]) {
      expect(text).toContain(s);
    }
  });
});

describe('TitleWords', () => {
  @Component({
    imports: [TitleWords],
    template: `<app-title-words [lines]="lines" [level]="2" />`,
  })
  class Host {
    readonly lines: readonly TitleLine[] = [
      { words: [{ text: 'Do' }, { text: 'front' }] },
      { words: [{ text: 'ao' }, { text: 'banco', em: true }] },
    ];
  }

  it('wraps each word, keeps one <br> and one <i>, and reads as plain text', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2.title')).not.toBeNull();
    expect(el.querySelectorAll('.w').length).toBe(4);
    expect(el.querySelectorAll('br').length).toBe(1);
    expect(el.querySelectorAll('i').length).toBe(1);
    expect(el.querySelector('i')?.textContent).toBe('banco');
    expect(el.textContent?.replace(/\s+/g, ' ').trim()).toBe('Do front ao banco');
    const delays = Array.from(el.querySelectorAll<HTMLElement>('.w > span')).map((s) => s.style.transitionDelay);
    expect(delays).toEqual(['0s', '0.07s', '0.14s', '0.21s']);
  });
});

describe('ProjectsSection', () => {
  it('emits the hovered project on mouse and focus, and null on leave', async () => {
    await TestBed.configureTestingModule({ imports: [ProjectsSection] }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsSection);
    await fixture.whenStable();
    const seen: (ProjectItem['id'] | null)[] = [];
    fixture.componentInstance.hovered.subscribe((v) => seen.push(v));
    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-project="climb"]')!;
    row.dispatchEvent(new MouseEvent('mouseenter'));
    row.dispatchEvent(new MouseEvent('mouseleave'));
    row.dispatchEvent(new FocusEvent('focusin'));
    row.dispatchEvent(new FocusEvent('focusout'));
    expect(seen).toEqual(['climb', null, 'climb', null]);
  });
});
