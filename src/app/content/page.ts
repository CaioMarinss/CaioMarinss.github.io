import { Injectable, Signal, computed, signal } from '@angular/core';
import { AnyChapterId, CHAPTER_IDS, LIFE_CHAPTER_IDS, Lang } from './content.types';

export type PageId = 'home' | 'life';

export const PAGE_PATHS: Record<PageId, Record<Lang, string>> = {
  home: { pt: '/', en: '/en/' },
  life: { pt: '/sobre/', en: '/en/about/' },
};

@Injectable({ providedIn: 'root' })
export class PageService {
  private readonly current = signal<PageId>('home');

  readonly page: Signal<PageId> = this.current.asReadonly();
  readonly chapterIds: Signal<readonly AnyChapterId[]> = computed(() =>
    this.current() === 'life' ? LIFE_CHAPTER_IDS : CHAPTER_IDS,
  );

  setPage(page: PageId): void {
    this.current.set(page);
  }
}
