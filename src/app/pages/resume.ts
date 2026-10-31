import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../content/language';
import { Lang, Link, TimelineEntry } from '../content/content.types';
import { SITE_ORIGIN, SeoService } from '../seo/seo';

const LABELS: Record<Lang, { summary: string; training: string; site: string }> = {
  pt: { summary: 'Resumo', training: 'Formação e cursos', site: 'Site' },
  en: { summary: 'Summary', training: 'Education and courses', site: 'Website' },
};

/** Currículo imprimível: uma coluna, sem foto, claro; é a fonte dos PDFs (scripts/generate-cv.mjs). */
@Component({
  selector: 'app-resume',
  templateUrl: './resume.html',
  styleUrl: './resume.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Resume {
  private readonly language = inject(LanguageService);
  protected readonly content = this.language.content;
  protected readonly labels = computed(() => LABELS[this.content().lang]);
  protected readonly courses = computed<readonly TimelineEntry[]>(() =>
    this.content().resume.timeline.filter((entry) => entry.kind === 'course'),
  );
  protected readonly contacts = computed<readonly Link[]>(() => [
    ...this.content().contact.links,
    { label: SITE_ORIGIN.replace('https://', ''), href: `${SITE_ORIGIN}/` },
  ]);

  constructor() {
    const lang = inject(ActivatedRoute).snapshot.data['lang'] as Lang;
    this.language.setLang(lang);
    inject(SeoService).applyResume(this.content());

    const html = inject(DOCUMENT).documentElement;
    html.classList.add('is-resume');
    inject(DestroyRef).onDestroy(() => html.classList.remove('is-resume'));
  }

  /** Visible link text without the protocol, so the printed page shows where each link goes. */
  protected readable(href: string): string {
    return href.replace(/^(https?:\/\/|mailto:)/, '').replace(/\/$/, '');
  }
}
