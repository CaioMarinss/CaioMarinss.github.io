import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../content/language';
import { TitleWords } from '../title-words';

@Component({
  selector: 'app-experience-section',
  imports: [TitleWords],
  templateUrl: './experience.html',
  styleUrl: './experience.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceSection {
  protected readonly content = inject(LanguageService).content;
}
