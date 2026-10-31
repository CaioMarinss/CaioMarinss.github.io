import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { DisplayMode } from './cinema/display-mode';
import { CONTENT } from './content/content';

describe('App', () => {
  it('renders the app shell', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  it('starts with the skip link, then the header, and no custom cursor in static mode', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    const first = root.querySelector('a, button');
    expect(first?.classList.contains('skip-link')).toBe(true);
    expect(first?.getAttribute('href')).toBe('/#intro');
    expect(first?.textContent?.trim()).toBe(CONTENT.pt.ui.skipLink);
    expect(root.querySelector('app-header + main.stage')).not.toBeNull();
    expect(root.querySelector('app-cursor')).toBeNull();
  });

  it('hides the site chrome on the résumé pages', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideLocationMocks()],
    }).compileComponents();
    TestBed.inject(Location).go('/en/resume');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.skip-link, app-header, app-cursor')).toBeNull();
    expect(root.querySelector('router-outlet')).not.toBeNull();
  });

  it('hides the chrome when navigating to the résumé and restores it on the way back', async () => {
    @Component({ template: '' })
    class Blank {}
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'curriculo', component: Blank, data: { bare: true } },
        ]),
        provideLocationMocks(),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const root = fixture.nativeElement as HTMLElement;

    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(root.querySelector('.skip-link')).not.toBeNull();
    expect(root.querySelector('app-header')).not.toBeNull();

    await router.navigateByUrl('/curriculo');
    await fixture.whenStable();
    expect(root.querySelector('.skip-link, app-header')).toBeNull();

    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(root.querySelector('.skip-link')).not.toBeNull();
    expect(root.querySelector('app-header')).not.toBeNull();
  });

  it('unmounts the custom cursor and restores the native one when cinema falls back', async () => {
    document.documentElement.classList.add('is-cinema');
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('pointer: fine'), media: q }));
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents();
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('app-cursor')).not.toBeNull();
      expect(document.documentElement.classList.contains('has-cursor')).toBe(true);

      TestBed.inject(DisplayMode).fallbackToStatic('chunk failed');
      await fixture.whenStable();
      expect(root.querySelector('app-cursor')).toBeNull();
      expect(document.documentElement.classList.contains('has-cursor')).toBe(false);
    } finally {
      document.documentElement.classList.remove('is-cinema', 'has-cursor');
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
