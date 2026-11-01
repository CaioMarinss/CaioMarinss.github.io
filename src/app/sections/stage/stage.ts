import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../content/language';
import { PAGE_PATHS } from '../../content/page';
import { TitleWords } from '../title-words';

@Component({
  selector: 'app-stage-section',
  imports: [TitleWords],
  templateUrl: './stage.html',
  styleUrl: './stage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StageSection {
  private readonly language = inject(LanguageService);
  protected readonly content = this.language.content;
  protected readonly lifeHref = computed(() => PAGE_PATHS.life[this.language.lang()]);
}
