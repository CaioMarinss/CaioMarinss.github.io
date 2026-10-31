import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject } from '@angular/core';
import { DisplayMode } from '../cinema/display-mode';
import { ScrollDirector } from '../cinema/scroll-director';
import { CHAPTER_IDS, Lang } from '../content/content.types';
import { LanguageService } from '../content/language';

/** Fixed menu, language switch, résumé button and the decorative chapter progress bar. */
@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly language = inject(LanguageService);
  private readonly director = inject(ScrollDirector);
  private readonly display = inject(DisplayMode);
  private readonly doc = inject(DOCUMENT);

  protected readonly chapters = CHAPTER_IDS;
  protected readonly content = this.language.content;
  protected readonly lang = this.language.lang;
  protected readonly active = this.director.activeChapter;

  protected readonly otherLang = computed<Lang>(() => (this.lang() === 'pt' ? 'en' : 'pt'));
  /** Real link to the other language that lands on the chapter being read. */
  protected readonly langHref = computed(() => {
    const index = this.active();
    return this.language.pathFor(this.otherLang(), index > 0 ? CHAPTER_IDS[index] : undefined);
  });

  /**
   * Cinema: chapters live in a fixed stage, so the anchor jump would do nothing — scroll to the
   * chapter's offset instead and move focus into it so Tab continues from there.
   * Static: the native anchor jump already scrolls and moves the focus start point.
   */
  protected navigate(event: MouseEvent, index: number): void {
    if (this.display.mode() !== 'cinema') return;
    // Let the browser handle new-tab/window and other modified or non-primary clicks.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.director.goTo(index);
    this.doc.getElementById(CHAPTER_IDS[index])?.focus({ preventScroll: true });
  }
}
