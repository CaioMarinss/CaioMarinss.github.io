import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '../../content/language';
import { ProjectItem } from '../../content/content.types';
import { TitleWords } from '../title-words';

@Component({
  selector: 'app-projects-section',
  imports: [TitleWords],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsSection {
  protected readonly content = inject(LanguageService).content;

  /** Project under the pointer or keyboard focus; null when none. */
  readonly hovered = output<ProjectItem['id'] | null>();
}
