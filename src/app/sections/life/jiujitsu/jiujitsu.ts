import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../../content/language';
import { TitleWords } from '../../title-words';

@Component({
  selector: 'app-jiujitsu-section',
  imports: [TitleWords],
  templateUrl: './jiujitsu.html',
  styleUrl: './jiujitsu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JiujitsuSection {
  protected readonly content = inject(LanguageService).content;
}
