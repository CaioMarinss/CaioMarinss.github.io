import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageService } from '../content/page';
import { ScrollDirector } from './scroll-director';

let scrollIntoView: ReturnType<typeof vi.fn>;
const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

function renderSections(ids: string[]): void {
  document.body.innerHTML = `<main>${ids
    .map((id, i) => `<section class="ch" id="${id}" data-chapter="${i}"></section>`)
    .join('')}</main>`;
}

describe('ScrollDirector on the life page', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView'];
    document.documentElement.classList.remove('is-cinema');
    TestBed.inject(PageService).setPage('life');
  });

  afterEach(() => {
    TestBed.inject(ScrollDirector).stop();
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
    if (original) Object.defineProperty(Element.prototype, 'scrollIntoView', original);
    else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('deep-links a life hash in static mode', () => {
    renderSections(['life-intro', 'jiujitsu', 'music', 'games', 'kart']);
    history.replaceState(null, '', '/sobre/#games');
    TestBed.inject(ScrollDirector).start();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('games'));
  });

  it('ignores home ids on the life page', () => {
    renderSections(['projects', 'games']);
    history.replaceState(null, '', '/sobre/#projects');
    TestBed.inject(ScrollDirector).start();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
