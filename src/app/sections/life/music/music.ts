import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../../content/language';
import { TitleWords } from '../../title-words';

@Component({
  selector: 'app-music-section',
  imports: [TitleWords],
  templateUrl: './music.html',
  styleUrl: './music.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicSection {
  protected readonly content = inject(LanguageService).content;
}
