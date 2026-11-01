import { Injectable, Signal, computed, signal } from '@angular/core';
import { CONTENT } from './content';
import { AnyChapterId, Lang, SiteContent } from './content.types';
import { PAGE_PATHS, PageId } from './page';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly current = signal<Lang>('pt');

  readonly lang: Signal<Lang> = this.current.asReadonly();
  readonly content: Signal<SiteContent> = computed(() => CONTENT[this.current()]);

  setLang(lang: Lang): void {
    this.current.set(lang);
  }

  /**
   * Path-qualified so links resolve correctly under <base href="/"> (a bare "#id" would point at
   * the PT home from /en/). Ends in a slash to match the prerendered en/index.html without a redirect.
   */
  pathFor(lang: Lang, fragment?: AnyChapterId, page: PageId = 'home'): string {
    const base = PAGE_PATHS[page][lang];
    return fragment ? `${base}#${fragment}` : base;
  }
}
