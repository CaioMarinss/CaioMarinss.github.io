import { ChangeDetectionStrategy, Component, DOCUMENT, afterNextRender, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Cursor } from './cinema/cursor';
import { DisplayMode } from './cinema/display-mode';
import { LanguageService } from './content/language';
import { PageService } from './content/page';
import { Header } from './layout/header';

const BARE_PATHS = /^\/(curriculo|en\/resume)\/?(?:[?#].*)?$/;

function isBare(route: ActivatedRouteSnapshot): boolean {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    if (current.data['bare']) return true;
    current = current.firstChild;
  }
  return false;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Cursor],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /**
   * Site chrome (skip link, header, cursor) is hidden on bare pages such as the résumé. Seeded from the
   * URL so server and client render the same tree before the first navigation settles.
   */
  protected readonly chrome = signal(!BARE_PATHS.test(inject(Location).path()));
  private readonly language = inject(LanguageService);
  private readonly pages = inject(PageService);
  protected readonly content = this.language.content;
  /** Path-qualified (see LanguageService.pathFor) so the skip link stays on /en/. */
  protected readonly skipHref = computed(() => this.language.pathFor(this.language.lang(), this.pages.chapterIds()[0], this.pages.page()));
  private readonly display = inject(DisplayMode);
  /** Client-only: set after hydration so server and client render the same tree. */
  private readonly finePointer = signal(false);
  /** Unmounts (restoring the native cursor) if the page falls back to static mid-session. */
  protected readonly customCursor = computed(() => this.chrome() && this.finePointer() && this.display.mode() === 'cinema');

  constructor() {
    const router = inject(Router);
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.chrome.set(!isBare(router.routerState.snapshot.root)));
    const win = inject(DOCUMENT).defaultView;
    afterNextRender(() => {
      this.finePointer.set(win?.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false);
    });
  }
}
