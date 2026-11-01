import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { CONTENT } from '../../content/content';
import { Home } from '../../pages/home';

async function renderHome(lang: 'pt' | 'en'): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [Home],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { lang } } } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Home);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('stage "more" link', () => {
  it('links to /sobre/ in pt', async () => {
    const root = await renderHome('pt');
    expect(root.querySelector('#stage a.more')?.getAttribute('href')).toBe('/sobre/');
  });

  it('links to /en/about/ in en', async () => {
    const root = await renderHome('en');
    expect(root.querySelector('#stage a.more')?.getAttribute('href')).toBe('/en/about/');
  });

  it('has an accessible label and no heading inside the link', async () => {
    const root = await renderHome('pt');
    const link = root.querySelector('#stage a.more');
    const label = link?.getAttribute('aria-label') ?? '';
    const visible = CONTENT.pt.stage.more.title
      .flatMap((line) => line.words.map((word) => word.text))
      .join(' ');
    expect(label).toBe(CONTENT.pt.stage.more.label);
    // WCAG 2.5.3: the accessible name contains the visible text
    expect(label.startsWith(visible)).toBe(true);
    expect(link?.querySelector('h1, h2, h3')).toBeNull();
    expect(link?.querySelector('.big i')).not.toBeNull();
  });
});
