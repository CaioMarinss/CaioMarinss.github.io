import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../content/language';
import { TitleWords } from '../title-words';

@Component({
  selector: 'app-intro-section',
  imports: [TitleWords],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroSection {
  protected readonly content = inject(LanguageService).content;
}
