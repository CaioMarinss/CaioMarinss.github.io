import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TitleLine } from '../content/content.types';

interface WordView {
  readonly text: string;
  readonly em: boolean;
  /** transition-delay in seconds, stepped per word across the whole title. */
  readonly delay: number;
  /** true when a space must precede the word (every word but the first). */
  readonly spaced: boolean;
}

/**
 * Editorial title. Each word sits in a mask (`.w`) so the cinematic layer can
 * slide it up; the text itself stays plain, readable HTML.
 */
@Component({
  selector: 'app-title-words',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (level() === 1) {
      <h1 class="title"><ng-container *ngTemplateOutlet="words" /></h1>
    } @else {
      <h2 class="title"><ng-container *ngTemplateOutlet="words" /></h2>
    }
    <ng-template #words>
      @for (line of view(); track $index) {
        @if ($index > 0) {
          <br />
        }
        @for (word of line; track $index) {
          @if (word.spaced) {
            {{ ' ' }}
          }
          @if (word.em) {
            <i><span class="w"><span [style.transition-delay.s]="word.delay">{{ word.text }}</span></span></i>
          } @else {
            <span class="w"><span [style.transition-delay.s]="word.delay">{{ word.text }}</span></span>
          }
        }
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class TitleWords {
  readonly lines = input.required<readonly TitleLine[]>();
  readonly level = input<1 | 2>(2);

  protected readonly view = computed<readonly (readonly WordView[])[]>(() => {
    let index = 0;
    return this.lines().map((line) =>
      line.words.map((word) => {
        const i = index++;
        return { text: word.text, em: word.em === true, delay: Math.round(i * 7) / 100, spaced: i > 0 };
      }),
    );
  });
}
