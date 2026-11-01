import { CONTENT, LIFE_CHAPTER_IDS, TitleLine } from './content';

function emphasisCount(title: readonly TitleLine[]): number {
  return title.flatMap((line) => line.words).filter((w) => w.em).length;
}

describe('life content', () => {
  for (const lang of ['pt', 'en'] as const) {
    describe(lang, () => {
      const life = CONTENT[lang].life;

      it('every life title has exactly one emphasised word', () => {
        const titles = [
          life.intro.title,
          life.jiujitsu.title,
          life.music.title,
          life.games.title,
          life.kart.title,
          CONTENT[lang].stage.more.title,
        ];
        for (const title of titles) {
          expect(emphasisCount(title)).toBe(1);
        }
      });

      it('life nav covers every life chapter', () => {
        expect(Object.keys(life.nav).sort()).toEqual([...LIFE_CHAPTER_IDS].sort());
      });

      it('lists the four games in order', () => {
        expect(life.games.items).toEqual([
          'The Last of Us',
          'Battlefield 6',
          'Call of Duty: Black Ops II',
          'Call of Duty: Modern Warfare 3',
        ]);
      });
    });
  }
});
