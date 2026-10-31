import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../content/language';
import { TitleWords } from '../title-words';

@Component({
  selector: 'app-stage-section',
  imports: [TitleWords],
  templateUrl: './stage.html',
  styleUrl: './stage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StageSection {
  protected readonly content = inject(LanguageService).content;
}
