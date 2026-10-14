import { describe, it, expect } from 'vitest';
import { localizeUnit, localizeCuisine, formatTime, timeNeedsSpanish } from '@/lib/i18n';

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

describe('formatTime (Spanish)', () => {
  it('translates the imported phrase that used to stay English', () => {
    expect(formatTime('About 2–2 ½ h from start to finish', 'es')).toBe('aprox. 2–2 ½ h de principio a fin');
  });
  it('keeps the plain forms working and leaves English alone', () => {
    expect(formatTime('1 hour 30 minutes', 'es')).toBe('1 h 30 min');
    expect(formatTime('45 min', 'es')).toBe('45 min');
    expect(formatTime('2 to 3 hours', 'es')).toBe('2 a 3 h');
    expect(formatTime('About 2 h', 'en')).toBe('About 2 h');
    expect(formatTime('', 'es')).toBe('');
    expect(formatTime(null, 'es')).toBe('');
  });
});

describe('timeNeedsSpanish', () => {
  it('is false for times formatTime can fully translate, or that are already Spanish', () => {
    expect(timeNeedsSpanish('About 2–2 ½ h from start to finish')).toBe(false);
    expect(timeNeedsSpanish('1 hour 30 minutes')).toBe(false);
    expect(timeNeedsSpanish('3 days')).toBe(false);
    expect(timeNeedsSpanish('Aprox. 2 horas')).toBe(false);
    expect(timeNeedsSpanish('')).toBe(false);
    expect(timeNeedsSpanish(null)).toBe(false);
  });
  it('is true when English words would be left over', () => {
    expect(timeNeedsSpanish('2 hours, depending on your oven')).toBe(true);
    expect(timeNeedsSpanish('Ready when golden')).toBe(true);
  });
});
