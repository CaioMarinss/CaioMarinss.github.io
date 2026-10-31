import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { CONTENT } from '../content/content';
import { SITE_ORIGIN, SeoService } from './seo';

describe('SeoService', () => {
  let doc: Document;
  let seo: SeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    doc = TestBed.inject(DOCUMENT);
    seo = TestBed.inject(SeoService);
  });

  it('sets lang, title, canonical, hreflang and og tags for en', () => {
    seo.apply(CONTENT.en, '/en');

    expect(doc.documentElement.lang).toBe('en');
    expect(doc.title).toBe(CONTENT.en.meta.title);
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/en/`);
    expect(doc.querySelector('link[rel=alternate][hreflang=pt-BR]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/`);
    expect(doc.querySelector('link[rel=alternate][hreflang=en]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/en/`);
    expect(doc.querySelector('link[rel=alternate][hreflang=x-default]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/`);
    expect(doc.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('en_US');
    expect(doc.querySelector('meta[name=description]')?.getAttribute('content')).toBe(CONTENT.en.meta.description);
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(CONTENT.en.meta.title);
    expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(`${SITE_ORIGIN}/en/`);
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      `${SITE_ORIGIN}/images/og-image.png`,
    );
  });

  it('uses pt-BR values for the root path', () => {
    seo.apply(CONTENT.pt, '/');
    expect(doc.documentElement.lang).toBe('pt-BR');
    expect(doc.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('pt_BR');
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/`);
  });

  it('does not duplicate tags when applied twice', () => {
    seo.apply(CONTENT.en, '/en');
    seo.apply(CONTENT.pt, '/');
    expect(doc.querySelectorAll('link[rel=canonical]').length).toBe(1);
    expect(doc.querySelectorAll('link[rel=alternate]').length).toBe(3);
    expect(doc.querySelectorAll('meta[property="og:title"]').length).toBe(1);
    expect(doc.querySelectorAll('meta[name=description]').length).toBe(1);
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(CONTENT.pt.meta.title);
  });
});
