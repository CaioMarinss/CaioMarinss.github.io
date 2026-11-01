import { TestBed } from '@angular/core/testing';
import { CHAPTER_IDS } from './content.types';
import { LanguageService } from './language';
import { PageService } from './page';

describe('PageService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('defaults to the home chapters', () => {
    const service = TestBed.inject(PageService);
    expect(service.page()).toBe('home');
    expect(service.chapterIds()).toEqual([...CHAPTER_IDS]);
  });

  it('switches to the life chapters', () => {
    const service = TestBed.inject(PageService);
    service.setPage('life');
    expect(service.chapterIds()).toEqual(['life-intro', 'jiujitsu', 'music', 'games', 'kart']);
  });

  it('builds life paths', () => {
    const language = TestBed.inject(LanguageService);
    expect(language.pathFor('pt', undefined, 'life')).toBe('/sobre/');
    expect(language.pathFor('en', 'music', 'life')).toBe('/en/about/#music');
    expect(language.pathFor('en', 'projects')).toBe('/en/#projects');
  });
});
