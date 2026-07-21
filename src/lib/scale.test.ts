import { describe, it, expect } from 'vitest';
import { scaleAmount, formatAmount } from '@/lib/scale';

describe('scaleAmount — fraction glyphs', () => {
  // Regression: glyphs used to be substituted without a separator, so "1½"
  // became the string "10.5" and doubling it produced 21.
  it('doubles a whole number with a trailing glyph', () => {
    expect(scaleAmount('1½', 2)).toBe('3');
    expect(scaleAmount('2½', 2)).toBe('5');
  });

  it('handles a glyph with a space before it', () => {
    expect(scaleAmount('1 ½', 2)).toBe('3');
  });

  it('handles a bare glyph', () => {
    expect(scaleAmount('½', 2)).toBe('1');
    expect(scaleAmount('¼', 2)).toBe('½');
  });

  it('scales thirds', () => {
    expect(scaleAmount('⅓', 3)).toBe('1');
    expect(scaleAmount('⅔', 3)).toBe('2');
  });

  it('scales by a fractional multiplier', () => {
    expect(scaleAmount('1½', 1.5)).toBe('2¼');
  });
});

describe('scaleAmount — eighths render as eighths', () => {
  // Regression: results were rounded to eighths but only ⅛ ¼ ½ ¾ existed in the
  // glyph table, so 0.375 rendered as ¼ (33% low) and 0.875 as ¾.
  it('renders three eighths, not a quarter', () => {
    expect(scaleAmount('3/4', 0.5)).toBe('⅜');
  });

  it('renders seven eighths, not three quarters', () => {
    expect(scaleAmount('1 3/4', 0.5)).toBe('⅞');
  });

  it('renders five eighths', () => {
    expect(scaleAmount('1¼', 0.5)).toBe('⅝');
  });

  it('covers every eighth', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(n => formatAmount(n / 8))).toEqual([
      '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞',
    ]);
  });
});

describe('scaleAmount — ranges are left alone', () => {
  // Regression: parseFloat("1-2") is 1, so a range silently collapsed to a
  // single number that looked precise.
  it('leaves a hyphenated range unchanged', () => {
    expect(scaleAmount('1-2', 2)).toBe('1-2');
  });

  it('leaves an en-dash range unchanged', () => {
    expect(scaleAmount('1–2', 2)).toBe('1–2');
  });

  it('leaves a spelled-out range unchanged', () => {
    expect(scaleAmount('2 to 3', 2)).toBe('2 to 3');
  });

  it('leaves a spaced range unchanged', () => {
    expect(scaleAmount('1 - 2', 3)).toBe('1 - 2');
  });
});

describe('scaleAmount — parsing and passthrough', () => {
  it('scales plain numbers', () => {
    expect(scaleAmount('2', 2)).toBe('4');
    expect(scaleAmount('4', 0.5)).toBe('2');
  });

  it('scales slash fractions', () => {
    expect(scaleAmount('1/2', 2)).toBe('1');
    expect(scaleAmount('1/2', 3)).toBe('1½');
  });

  it('scales mixed numbers', () => {
    expect(scaleAmount('1 1/2', 2)).toBe('3');
  });

  it('scales decimals', () => {
    expect(scaleAmount('0.25', 2)).toBe('½');
  });

  it('preserves a trailing qualifier', () => {
    expect(scaleAmount('2 large', 2)).toBe('4 large');
  });

  it('returns unparseable amounts unchanged', () => {
    expect(scaleAmount('a pinch', 2)).toBe('a pinch');
    expect(scaleAmount('to taste', 3)).toBe('to taste');
  });

  it('returns the author’s own text at multiplier 1', () => {
    expect(scaleAmount('1½', 1)).toBe('1½');
    expect(scaleAmount('1-2', 1)).toBe('1-2');
  });

  it('handles empty and missing amounts', () => {
    expect(scaleAmount('', 2)).toBe('');
    expect(scaleAmount(null, 2)).toBe('');
    expect(scaleAmount(undefined, 2)).toBe('');
  });

  it('ignores nonsensical multipliers', () => {
    expect(scaleAmount('2', 0)).toBe('2');
    expect(scaleAmount('2', -1)).toBe('2');
    expect(scaleAmount('2', Number.NaN)).toBe('2');
  });

  it('falls back to decimals below an eighth rather than showing 0', () => {
    expect(scaleAmount('⅛', 0.25)).toBe('0.03');
  });
});
