import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LanguageService } from '../content/language';
import { ChapterId } from '../content/content.types';
import { Home } from './home';

describe('Home', () => {
  it('sets the language from route data', async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { lang: 'en' }, fragment: 'projects' } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    expect(TestBed.inject(LanguageService).lang()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the current chapter when switching language', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { lang: 'pt' }, fragment: 'projects' } } }],
    });
    const fragment = TestBed.inject(ActivatedRoute).snapshot.fragment as ChapterId;
    expect(TestBed.inject(LanguageService).pathFor('en', fragment)).toBe('/en/#projects');
  });
});
