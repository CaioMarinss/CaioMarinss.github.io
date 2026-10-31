import { CONTENT } from './content';

function shape(value: unknown): unknown {
  if (typeof value === 'string') return 's';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  }
  return value;
}

describe('content', () => {
  it('PT and EN have the same structure', () => {
    const pt = shape({ ...CONTENT.pt, lang: '' });
    const en = shape({ ...CONTENT.en, lang: '' });
    expect(en).toEqual(pt);
  });

  it('lists the three approved projects in order', () => {
    expect(CONTENT.pt.projects.items.map((p) => p.id)).toEqual(['almeida', 'climb', 'continuar']);
    expect(CONTENT.en.projects.items.map((p) => p.id)).toEqual(['almeida', 'climb', 'continuar']);
  });

  it('never ships a screenshot for Almeida JJ', () => {
    for (const lang of ['pt', 'en'] as const) {
      expect(CONTENT[lang].projects.items.find((p) => p.id === 'almeida')!.preview).toBeUndefined();
    }
  });

  it('spells Núclea with accent', () => {
    for (const lang of ['pt', 'en'] as const) {
      const json = JSON.stringify(CONTENT[lang]);
      expect(json).toContain('Núclea');
      expect(json).not.toContain('Nuclea');
    }
  });

  it('keeps one emphasised word per title line group', () => {
    for (const lang of ['pt', 'en'] as const) {
      const c = CONTENT[lang];
      for (const title of [c.intro.title, c.experience.title, c.projects.title, c.stage.title, c.contact.title]) {
        const em = title.flatMap((l) => l.words).filter((w) => w.em);
        expect(em.length).toBe(1);
      }
    }
  });

  it('has no phone or Instagram', () => {
    for (const lang of ['pt', 'en'] as const) {
      expect(JSON.stringify(CONTENT[lang]).toLowerCase()).not.toContain('instagram');
    }
  });
});
