// Servings scaling: "1½ cups" doubled is "3 cups".
//
// Amounts are free text because that is how people write recipes ("2", "1/2",
// "1½", "a pinch"). This module parses the numeric part when it can, scales it,
// and renders it back as a cook-readable fraction. Anything it cannot parse with
// confidence is returned UNCHANGED, which is the honest failure: leaving "a
// pinch" alone when you double a recipe is right, and leaving "1-2 cloves" alone
// is better than silently collapsing the range to one number.
//
// Three bugs in the inline helper this replaces are fixed here, all of which
// produced wrong quantities rather than visibly wrong output:
//
//   1. Fraction glyphs were substituted without a separator, so "1½" became the
//      string "10.5" and a doubled 1½ cups came out as 21 cups.
//   2. Results were rounded to eighths but rendered with only quarter glyphs, so
//      ⅜ displayed as ¼ (a third off) and ⅞ displayed as ¾.
//   3. Ranges parsed as their first number, so "1-2 cloves" doubled read as a
//      precise "2 cloves".

const FRACTION_VALUE: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const EIGHTH_GLYPH: Record<number, string> = {
  1: '⅛',
  2: '¼',
  3: '⅜',
  4: '½',
  5: '⅝',
  6: '¾',
  7: '⅞',
};

// "1-2", "2 to 3", "1–2". A range has no single correct scaling, so we leave it.
// Note: exclude mixed-number shorthand like "1-1/2" (meaning "1 1/2").
const RANGE = /(?:\d\s*(?:to)\s*\d)|(?:\d\s*[-–—]\s*\d)|(?:\d[-–—]\d(?!\s*\/\d))/i;

/** Numeric value of one whitespace-separated token, or null if it is not one. */
function tokenValue(token: string): number | null {
  if (token.includes('/')) {
    const [numerator, denominator] = token.split('/');
    const n = Number.parseFloat(numerator);
    const d = Number.parseFloat(denominator);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return n / d;
  }
  const n = Number.parseFloat(token);
  return Number.isFinite(n) ? n : null;
}

/**
 * Split an amount into its leading quantity and whatever trails it.
 *
 * "1 1/2" -> { value: 1.5, suffix: "" }
 * "2 large" -> { value: 2, suffix: "large" }
 * "a pinch" -> null
 *
 * The suffix is preserved verbatim so scaling never eats a qualifier the author
 * wrote. Tokens are consumed left to right and stop at the first non-numeric one,
 * because "2 large 1" should not somehow total 3.
 */
function splitQuantity(amount: string): { value: number; suffix: string } | null {
  // Glyphs are padded with spaces before tokenising so "1½" reads as two tokens.
  let text = amount.trim();
  for (const glyph of Object.keys(FRACTION_VALUE)) {
    if (text.includes(glyph)) text = text.split(glyph).join(` ${glyph} `);
  }

  const tokens = text.split(/\s+/).filter(Boolean);
  let value = 0;
  let consumed = 0;

  for (const token of tokens) {
    const fraction = FRACTION_VALUE[token];
    if (fraction !== undefined) {
      value += fraction;
      consumed++;
      continue;
    }
    const parsed = tokenValue(token);
    if (parsed === null) break;
    value += parsed;
    consumed++;
  }

  if (consumed === 0) return null;
  return { value, suffix: tokens.slice(consumed).join(' ') };
}

/**
 * Render a number the way a cook writes it: whole numbers plain, everything else
 * to the nearest eighth with the matching glyph.
 *
 * Values that round to zero but are not zero fall back to two decimals, because
 * a quarter-batch of ⅛ tsp is a real (if fussy) amount and "0 tsp" is not.
 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';

  const rounded = Math.round(value * 8) / 8;
  if (rounded === 0) return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

  const whole = Math.floor(rounded);
  const eighths = Math.round((rounded - whole) * 8);
  if (eighths === 0) return String(whole);

  const glyph = EIGHTH_GLYPH[eighths];
  return whole > 0 ? `${whole}${glyph}` : glyph;
}

/**
 * Scale one amount by `multiplier`, preserving anything unparseable as-is.
 *
 * Callers pass `servings / originalServings`; a multiplier of exactly 1 short
 * circuits so an unscaled recipe always shows precisely what its author typed,
 * glyphs and all, rather than a normalised rewrite of it.
 */
export function scaleAmount(amount: string | null | undefined, multiplier: number): string {
  if (!amount) return '';
  if (!Number.isFinite(multiplier) || multiplier <= 0) return amount;
  if (multiplier === 1) return amount;
  if (RANGE.test(amount)) return amount;

  const quantity = splitQuantity(amount);
  if (quantity === null) return amount;

  const scaled = formatAmount(quantity.value * multiplier);
  return quantity.suffix ? `${scaled} ${quantity.suffix}` : scaled;
}
