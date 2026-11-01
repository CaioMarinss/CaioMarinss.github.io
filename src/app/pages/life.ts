import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AmbientBackground } from '../cinema/ambient-background';
import { CinemaCanvas } from '../cinema/cinema-canvas';
import { DisplayMode } from '../cinema/display-mode';
import { ScrollDirector } from '../cinema/scroll-director';
import { Lang } from '../content/content.types';
import { LanguageService } from '../content/language';
import { PageService } from '../content/page';
import { SeoService } from '../seo/seo';
import { GamesSection } from '../sections/life/games/games';
import { JiujitsuSection } from '../sections/life/jiujitsu/jiujitsu';
import { KartSection } from '../sections/life/kart/kart';
import { LifeIntroSection } from '../sections/life/life-intro/life-intro';
import { MusicSection } from '../sections/life/music/music';

/** "Além do código" (/sobre/, /en/about/): five personal chapters on the same stage as the home. */
@Component({
  selector: 'app-life',
  imports: [LifeIntroSection, JiujitsuSection, MusicSection, GamesSection, KartSection, CinemaCanvas, AmbientBackground],
  template: `
    <app-life-intro-section />
    <app-jiujitsu-section />
    <app-music-section />
    <app-games-section />
    <app-kart-section />
    @if (scene()) {
      <app-cinema-canvas />
    } @else if (hydrated()) {
      <app-ambient-background />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Life {
  private readonly language = inject(LanguageService);
  private readonly display = inject(DisplayMode);
  /** Client-only (set after hydration so server and client render the same tree). */
  protected readonly hydrated = signal(false);
  /** Unmounts the 3D layer if the page falls back to static mid-session. */
  protected readonly scene = computed(() => this.hydrated() && this.display.mode() === 'cinema');

  constructor() {
    const lang = inject(ActivatedRoute).snapshot.data['lang'] as Lang;
    this.language.setLang(lang);
    // Before the first render: the scene picks its shape set from the page once, when it is created.
    inject(PageService).setPage('life');
    inject(SeoService).applyLife(this.language.content());

    const director = inject(ScrollDirector);
    afterNextRender(() => {
      director.start();
      this.hydrated.set(true);
    });
    inject(DestroyRef).onDestroy(() => director.stop());
  }
}
