import { Injectable, Signal, computed, signal } from '@angular/core';
import { CONTENT } from './content';
import { ChapterId, Lang, SiteContent } from './content.types';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly current = signal<Lang>('pt');

  readonly lang: Signal<Lang> = this.current.asReadonly();
  readonly content: Signal<SiteContent> = computed(() => CONTENT[this.current()]);

  setLang(lang: Lang): void {
    this.current.set(lang);
  }

  pathFor(lang: Lang, fragment?: ChapterId): string {
    const base = lang === 'en' ? '/en' : '/';
    return fragment ? `${base}#${fragment}` : base;
  }
}
