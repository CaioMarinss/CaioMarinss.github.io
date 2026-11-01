import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../../content/language';
import { PAGE_PATHS } from '../../../content/page';
import { TitleWords } from '../../title-words';

@Component({
  selector: 'app-kart-section',
  imports: [TitleWords],
  templateUrl: './kart.html',
  styleUrl: './kart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KartSection {
  private readonly language = inject(LanguageService);
  protected readonly content = this.language.content;
  /** Plain href (full reload): the home builds its own particle scene on load. */
  protected readonly homeHref = computed(() => PAGE_PATHS.home[this.language.lang()]);
}
