import { describe, it, expect } from 'vitest';
import { translations } from '@/lib/i18n';

/**
 * Guards against EN/ES drift: every UI string key must exist in both locales,
 * so adding an English string without its Spanish translation (or vice-versa)
 * fails CI instead of silently leaking the other language to users.
 */
describe('i18n key coverage', () => {
  const en = Object.keys(translations.en);
  const es = Object.keys(translations.es);

  it('every EN key has an ES translation', () => {
    const missingInEs = en.filter(k => !(k in translations.es));
    expect(missingInEs, `missing in ES: ${missingInEs.join(', ')}`).toEqual([]);
  });

  it('every ES key has an EN counterpart', () => {
    const missingInEn = es.filter(k => !(k in translations.en));
    expect(missingInEn, `missing in EN: ${missingInEn.join(', ')}`).toEqual([]);
  });
});
