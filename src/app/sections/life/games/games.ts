import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../../content/language';
import { TitleWords } from '../../title-words';

@Component({
  selector: 'app-games-section',
  imports: [TitleWords],
  templateUrl: './games.html',
  styleUrl: './games.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesSection {
  protected readonly content = inject(LanguageService).content;
}
