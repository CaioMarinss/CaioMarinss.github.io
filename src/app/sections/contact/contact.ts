import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../content/language';
import { TitleWords } from '../title-words';

@Component({
  selector: 'app-contact-section',
  imports: [TitleWords],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSection {
  protected readonly content = inject(LanguageService).content;

  protected isExternal(href: string): boolean {
    return href.startsWith('http');
  }
}
