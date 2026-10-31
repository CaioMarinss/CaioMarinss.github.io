import { CONTENT_EN } from './content.en';
import { CONTENT_PT } from './content.pt';
import { Lang, SiteContent } from './content.types';

export const CONTENT: Record<Lang, SiteContent> = { pt: CONTENT_PT, en: CONTENT_EN };

export * from './content.types';
