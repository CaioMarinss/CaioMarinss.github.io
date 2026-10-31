import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { CONTENT } from '../content/content';
import { Lang } from '../content/content.types';
import { SeoService } from '../seo/seo';
import { Resume } from './resume';

async function render(lang: Lang): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [Resume],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { lang } } } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Resume);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Resume', () => {
  afterEach(() => {
    document.head.querySelector('meta[name=robots]')?.remove();
    document.documentElement.classList.remove('is-resume');
  });

  it('shows the facts of the PT résumé without a photo', async () => {
    const root = await render('pt');
    const text = root.textContent ?? '';

    expect(text).toContain('Caio Marins');
    expect(text).toContain('caio.marins011@gmail.com');
    expect(root.querySelector('a[href="https://www.linkedin.com/in/caio-marins-247633265/"]')).not.toBeNull();
    expect(root.querySelector('a[href="https://github.com/CaioMarinss"]')).not.toBeNull();
    expect(root.querySelector('a[href="mailto:caio.marins011@gmail.com"]')).not.toBeNull();
    expect(text).toContain('Núclea');
    expect(text).toContain('02/2025');
    expect(text).toContain('09/2025');
    for (const project of CONTENT.pt.projects.items) expect(text).toContain(project.name);
    expect(text).toContain('2027/1');
    expect(text).toContain('Inglês — B2');
    expect(text).not.toMatch(/Almeida JJ.*captura/i);
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('app-header, app-cursor, canvas')).toBeNull();
  });

  it('renders the EN résumé from the EN content', async () => {
    const root = await render('en');
    const text = root.textContent ?? '';

    expect(text).toContain('Junior Full Stack Developer');
    expect(text).toContain('English — B2');
    expect(text).toContain('Núclea');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toContain('Résumé');
  });

  it('is noindex, sets the PT language, and drops noindex when a normal page applies SEO', async () => {
    await render('pt');

    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(document.documentElement.classList.contains('is-resume')).toBe(true);

    TestBed.inject(SeoService).apply(CONTENT.pt, '/');
    expect(document.querySelector('meta[name=robots]')).toBeNull();
  });
});
