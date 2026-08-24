import { describe, it, expect } from 'vitest';
import { parseMinutes, isoFromMinutes } from '@/lib/time';

describe('parseMinutes', () => {
  it('parses common recipe time strings', () => {
    expect(parseMinutes('45 min')).toBe(45);
    expect(parseMinutes('30 minutes')).toBe(30);
    expect(parseMinutes('1 hour')).toBe(60);
    expect(parseMinutes('1 hour 30 minutes')).toBe(90);
    expect(parseMinutes('2 hrs')).toBe(120);
    expect(parseMinutes('1h 30m')).toBe(90);
  });

  it('treats a bare number as minutes', () => {
    expect(parseMinutes('20')).toBe(20);
  });

  it('expands days and weeks (ferments) into minutes', () => {
    expect(parseMinutes('3 days')).toBe(3 * 24 * 60);
    expect(parseMinutes('2 weeks')).toBe(2 * 7 * 24 * 60);
  });

  it('returns null for empty or non-numeric input', () => {
    expect(parseMinutes('')).toBeNull();
    expect(parseMinutes(null)).toBeNull();
    expect(parseMinutes(undefined)).toBeNull();
    expect(parseMinutes('overnight')).toBeNull();
  });
});

describe('isoFromMinutes', () => {
  it('formats minutes as ISO-8601 durations', () => {
    expect(isoFromMinutes(45)).toBe('PT45M');
    expect(isoFromMinutes(60)).toBe('PT1H');
    expect(isoFromMinutes(90)).toBe('PT1H30M');
  });

  it('rounds non-integer minutes to a valid duration (never PT1H60M)', () => {
    expect(isoFromMinutes(119.6)).toBe('PT2H');
    expect(isoFromMinutes(90.4)).toBe('PT1H30M');
    expect(isoFromMinutes(59.6)).toBe('PT1H');
  });

  it('returns undefined for missing or non-positive values', () => {
    expect(isoFromMinutes(null)).toBeUndefined();
    expect(isoFromMinutes(undefined)).toBeUndefined();
    expect(isoFromMinutes(0)).toBeUndefined();
  });
});
