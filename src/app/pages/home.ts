import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CinemaCanvas } from '../cinema/cinema-canvas';
import { DisplayMode } from '../cinema/display-mode';
import { ProjectHover } from '../cinema/project-hover';
import { ScrollDirector } from '../cinema/scroll-director';
import { LanguageService } from '../content/language';
import { Lang } from '../content/content.types';
import { SeoService } from '../seo/seo';
import { ContactSection } from '../sections/contact/contact';
import { ExperienceSection } from '../sections/experience/experience';
import { IntroSection } from '../sections/intro/intro';
import { ProjectsSection } from '../sections/projects/projects';
import { StageSection } from '../sections/stage/stage';

/** Página única: cinco capítulos; empilhados no modo estático, sobrepostos num palco fixo no modo cinema. */
@Component({
  selector: 'app-home',
  imports: [IntroSection, ExperienceSection, ProjectsSection, StageSection, ContactSection, CinemaCanvas],
  template: `
    <app-intro-section />
    <app-experience-section />
    <app-projects-section (hovered)="projectHover.set($event)" />
    <app-stage-section />
    <app-contact-section />
    @if (scene()) {
      <app-cinema-canvas />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly language = inject(LanguageService);
  private readonly display = inject(DisplayMode);
  protected readonly projectHover = inject(ProjectHover).hovered;
  /** Client-only (set after hydration so server and client render the same tree). */
  private readonly hydrated = signal(false);
  /** Unmounts the 3D layer if the page falls back to static mid-session. */
  protected readonly scene = computed(() => this.hydrated() && this.display.mode() === 'cinema');

  constructor() {
    const lang = inject(ActivatedRoute).snapshot.data['lang'] as Lang;
    this.language.setLang(lang);
    inject(SeoService).apply(this.language.content(), this.language.pathFor(lang));

    const director = inject(ScrollDirector);
    afterNextRender(() => {
      director.start();
      this.hydrated.set(true);
    });
    inject(DestroyRef).onDestroy(() => {
      director.stop();
      this.projectHover.set(null);
    });
  }
}
