import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONTENT } from '../content/content';
import { SITE_ORIGIN, SeoService } from './seo';

describe('SeoService.applyLife', () => {
  let doc: Document;
  let seo: SeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    doc = TestBed.inject(DOCUMENT);
    seo = TestBed.inject(SeoService);
  });

  const href = (selector: string): string | null | undefined => doc.querySelector(selector)?.getAttribute('href');

  it('sets canonical and alternates for /sobre/', () => {
    seo.applyLife(CONTENT.pt);
    expect(doc.documentElement.lang).toBe('pt-BR');
    expect(href('link[rel=canonical]')).toBe(`${SITE_ORIGIN}/sobre/`);
    expect(href('link[rel=alternate][hreflang=pt-BR]')).toBe(`${SITE_ORIGIN}/sobre/`);
    expect(href('link[rel=alternate][hreflang=en]')).toBe(`${SITE_ORIGIN}/en/about/`);
    expect(href('link[rel=alternate][hreflang=x-default]')).toBe(`${SITE_ORIGIN}/sobre/`);
    expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(`${SITE_ORIGIN}/sobre/`);
    expect(doc.querySelectorAll('link[rel=alternate]').length).toBe(3);
  });

  it('sets life title and description in en', () => {
    seo.applyLife(CONTENT.en);
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.title).toBe(CONTENT.en.life.meta.title);
    expect(doc.querySelector('meta[name=description]')?.getAttribute('content')).toBe(CONTENT.en.life.meta.description);
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(CONTENT.en.life.meta.title);
    expect(href('link[rel=canonical]')).toBe(`${SITE_ORIGIN}/en/about/`);
    expect(doc.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('en_US');
  });
});
