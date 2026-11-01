import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../../content/language';
import { TitleWords } from '../../title-words';

@Component({
  selector: 'app-life-intro-section',
  imports: [TitleWords],
  templateUrl: './life-intro.html',
  styleUrl: './life-intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifeIntroSection {
  protected readonly content = inject(LanguageService).content;
}
