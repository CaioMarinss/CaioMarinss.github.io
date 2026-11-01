import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject } from '@angular/core';
import { DisplayMode } from '../cinema/display-mode';
import { ScrollDirector } from '../cinema/scroll-director';
import { CHAPTER_IDS, LIFE_CHAPTER_IDS, Lang } from '../content/content.types';
import { LanguageService } from '../content/language';
import { PAGE_PATHS, PageService } from '../content/page';

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
  private readonly pages = inject(PageService);

  protected readonly chapters = computed(() => this.pages.chapterIds());
  protected readonly isLife = computed(() => this.pages.page() === 'life');
  protected readonly content = this.language.content;
  protected readonly lang = this.language.lang;
  protected readonly active = this.director.activeChapter;

  protected readonly otherLang = computed<Lang>(() => (this.lang() === 'pt' ? 'en' : 'pt'));
  /** Chapter links carry the language path so they keep working without JS or in a new tab. */
  protected readonly chapterHrefs = computed(() => this.chapters().map((id) => this.language.pathFor(this.lang(), id, this.pages.page())));

  /** The brand goes to the first chapter on the home and back to the home from the life page. */
  protected readonly brandHref = computed(() =>
    this.isLife() ? PAGE_PATHS.home[this.lang()] : this.chapterHrefs()[0],
  );

  /** Menu labels, in chapter order: each page has its own nav dictionary. */
  protected readonly labels = computed<readonly string[]>(() => {
    const c = this.content();
    return this.isLife() ? LIFE_CHAPTER_IDS.map((id) => c.life.nav[id]) : CHAPTER_IDS.map((id) => c.nav[id]);
  });

  /** Real link to the other language that lands on the chapter being read. */
  protected readonly langHref = computed(() => {
    const index = this.active();
    return this.language.pathFor(this.otherLang(), index > 0 ? this.chapters()[index] : undefined, this.pages.page());
  });

  protected onBrand(event: MouseEvent): void {
    if (!this.isLife()) this.navigate(event, 0);
  }

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
    this.doc.getElementById(this.chapters()[index])?.focus({ preventScroll: true });
  }
}
