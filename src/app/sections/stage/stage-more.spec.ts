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
    expect(link?.getAttribute('aria-label')).toBe(CONTENT.pt.stage.more.label);
    expect(link?.querySelector('h1, h2, h3')).toBeNull();
    expect(link?.querySelector('.big i')).not.toBeNull();
  });
});
