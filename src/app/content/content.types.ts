export type Lang = 'pt' | 'en';

export const CHAPTER_IDS = ['intro', 'experience', 'projects', 'stage', 'contact'] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];
export const LIFE_CHAPTER_IDS = ['life-intro', 'jiujitsu', 'music', 'games', 'kart'] as const;
export type LifeChapterId = (typeof LIFE_CHAPTER_IDS)[number];
export type AnyChapterId = ChapterId | LifeChapterId;

export interface TitleWord {
  readonly text: string;
  readonly em?: boolean;
}

/** One visual line of a title. Each title has exactly one emphasised word. */
export interface TitleLine {
  readonly words: readonly TitleWord[];
}

export interface Link {
  readonly label: string;
  readonly href: string;
}

export interface ProjectPreview {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface ProjectItem {
  readonly id: 'almeida' | 'climb' | 'continuar';
  readonly name: string;
  readonly summary: string;
  readonly tags: readonly string[];
  readonly status: string;
  readonly award?: string;
  readonly links: readonly Link[];
  readonly preview?: ProjectPreview;
}

export interface TimelineEntry {
  readonly period: string;
  readonly title: string;
  readonly detail?: string;
  /** Training entries; the résumé lists them under education and courses. */
  readonly kind?: 'course';
}

export interface StageEvent {
  readonly meta: string;
  readonly title: string;
  readonly text: string;
}

export interface SiteContent {
  readonly lang: Lang;
  readonly meta: { readonly title: string; readonly description: string };
  readonly nav: Record<ChapterId, string>;
  readonly life: { readonly nav: Record<LifeChapterId, string> };
  readonly ui: {
    readonly resume: string;
    readonly resumeHref: string;
    readonly scrollHint: string;
    readonly skipLink: string;
    readonly switchLang: string;
  };
  readonly intro: {
    readonly kicker: string;
    readonly title: readonly TitleLine[];
    readonly paragraphs: readonly string[];
  };
  readonly experience: {
    readonly kicker: string;
    readonly title: readonly TitleLine[];
    readonly company: string;
    readonly companyNote: string;
    readonly ladder: readonly { readonly period: string; readonly role: string; readonly em?: boolean }[];
    readonly paragraph: string;
    readonly stackLabel: string;
    readonly stack: readonly string[];
  };
  readonly projects: {
    readonly kicker: string;
    readonly title: readonly TitleLine[];
    readonly items: readonly ProjectItem[];
  };
  readonly stage: {
    readonly kicker: string;
    readonly title: readonly TitleLine[];
    readonly events: readonly StageEvent[];
  };
  readonly contact: {
    readonly kicker: string;
    readonly title: readonly TitleLine[];
    readonly facts: readonly string[];
    readonly links: readonly Link[];
  };
  readonly resume: {
    readonly role: string;
    readonly summary: string;
    readonly timelineLabel: string;
    readonly timeline: readonly TimelineEntry[];
    readonly languagesLabel: string;
    readonly languages: readonly string[];
    readonly educationLabel: string;
    readonly education: readonly string[];
  };
}
