import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Lang, SiteContent } from '../content/content.types';
import { PAGE_PATHS } from '../content/page';

export const SITE_ORIGIN = 'https://caiomarinss.github.io';

const OG_IMAGE = `${SITE_ORIGIN}/images/og-image.png`;
const HTML_LANG: Record<Lang, string> = { pt: 'pt-BR', en: 'en' };
const OG_LOCALE: Record<Lang, string> = { pt: 'pt_BR', en: 'en_US' };

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  apply(content: SiteContent, path: string): void {
    // Prerender emits en/index.html and GitHub Pages redirects /en -> /en/, so the canonical URL ends in a slash.
    const url = SITE_ORIGIN + (path.endsWith('/') ? path : `${path}/`);
    this.applyMeta(content.lang, content.meta, url, PAGE_PATHS.home);
  }

  /** Life page (/sobre/, /en/about/): its own title, description, canonical and alternates. */
  applyLife(content: SiteContent): void {
    const paths = PAGE_PATHS.life;
    this.applyMeta(content.lang, content.life.meta, SITE_ORIGIN + paths[content.lang], paths);
  }

  private applyMeta(
    lang: Lang,
    { title, description }: { readonly title: string; readonly description: string },
    url: string,
    alternates: Record<Lang, string>,
  ): void {
    this.doc.documentElement.lang = HTML_LANG[lang];
    this.title.setTitle(title);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:locale', content: OG_LOCALE[lang] });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    // Only the résumé pages are noindex; make sure a previous résumé view doesn't leak it.
    this.meta.removeTag('name="robots"');

    this.setLink('canonical', url);
    this.setLink('alternate', SITE_ORIGIN + alternates.pt, 'pt-BR');
    this.setLink('alternate', SITE_ORIGIN + alternates.en, 'en');
    this.setLink('alternate', SITE_ORIGIN + alternates.pt, 'x-default');
  }

  /** Résumé pages: language and title only, kept out of search indexes. */
  applyResume(content: SiteContent): void {
    this.doc.documentElement.lang = HTML_LANG[content.lang];
    this.title.setTitle(`Caio Marins · ${content.ui.resume}`);
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let el = this.doc.head.querySelector<HTMLLinkElement>(selector);
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', rel);
      if (hreflang) el.setAttribute('hreflang', hreflang);
      this.doc.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }
}
