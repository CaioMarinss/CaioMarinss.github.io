import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type DisplayModeValue = 'cinema' | 'static';

@Injectable({ providedIn: 'root' })
export class DisplayMode {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly state = signal<DisplayModeValue>(
    this.browser && this.doc.documentElement.classList.contains('is-cinema') ? 'cinema' : 'static',
  );

  readonly mode = this.state.asReadonly();

  fallbackToStatic(reason: string): void {
    if (this.browser) this.doc.documentElement.classList.remove('is-cinema');
    console.warn(reason);
    this.state.set('static');
  }
}
