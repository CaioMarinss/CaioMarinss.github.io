import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language';

describe('LanguageService', () => {
  let service: LanguageService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  it('builds paths for pt and en, with and without fragment', () => {
    expect(service.pathFor('pt')).toBe('/');
    expect(service.pathFor('pt', 'projects')).toBe('/#projects');
    expect(service.pathFor('en')).toBe('/en/');
    expect(service.pathFor('en', 'projects')).toBe('/en/#projects');
  });

  it('switches content with the language', () => {
    expect(service.lang()).toBe('pt');
    expect(service.content().lang).toBe('pt');
    service.setLang('en');
    expect(service.content().lang).toBe('en');
  });
});
