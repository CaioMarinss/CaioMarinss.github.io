import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DisplayMode } from '../../../cinema/display-mode';
import { ScrollDirector } from '../../../cinema/scroll-director';
import { LanguageService } from '../../../content/language';
import { TitleWords } from '../../title-words';

/** Static mode: start loading the player this far before it scrolls into view. */
const PRELOAD_MARGIN = '300px 0px';

@Component({
  selector: 'app-music-section',
  imports: [TitleWords],
  templateUrl: './music.html',
  styleUrl: './music.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicSection {
  protected readonly content = inject(LanguageService).content;
  /**
   * The Spotify embed is heavy, so it is mounted on the client only once it is about to be seen and
   * then kept; SSR and the first paint get a same-size placeholder. In cinema every chapter sits in
   * the fixed stage (always "in the viewport"), so the trigger is leaving the opening chapter.
   */
  protected readonly embed = signal(false);
  private readonly player = viewChild.required<ElementRef<HTMLElement>>('player');

  constructor() {
    const display = inject(DisplayMode);
    const director = inject(ScrollDirector);
    const win = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const hydrated = signal(false);
    let observer: IntersectionObserver | null = null;

    afterNextRender(() => hydrated.set(browser));
    destroyRef.onDestroy(() => observer?.disconnect());

    effect(() => {
      if (!hydrated() || this.embed()) return;
      if (display.mode() === 'cinema') {
        if (director.activeChapter() >= 1) this.embed.set(true);
        return;
      }
      if (observer) return;
      if (!win || typeof win.IntersectionObserver !== 'function') {
        this.embed.set(true);
        return;
      }
      const io = new win.IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          this.embed.set(true);
        },
        { rootMargin: PRELOAD_MARGIN },
      );
      io.observe(this.player().nativeElement);
      observer = io;
    });
  }
}
