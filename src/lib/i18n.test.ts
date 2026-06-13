import { describe, it, expect } from 'vitest';
import { localizeUnit, localizeCuisine } from '@/lib/i18n';

describe('i18n display localizers', () => {
  it('returns the input unchanged for English', () => {
    expect(localizeUnit('cup', 'en')).toBe('cup');
    expect(localizeCuisine('Costa Rican', 'en')).toBe('Costa Rican');
  });

  it('passes through values with no Spanish mapping', () => {
    expect(localizeUnit('totally-unknown-unit', 'es')).toBe('totally-unknown-unit');
    expect(localizeCuisine('Klingon', 'es')).toBe('Klingon');
  });
});
