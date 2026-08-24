// Metric ⇄ imperial conversion for ingredient amounts and step temperatures.
//
// Deliberately conservative, in the spirit of scale.ts: it only converts units
// it recognizes as volume or weight, leaves counts/qualifiers ("2 large",
// "a pinch", "1 clove") and ranges untouched, and never converts a value that's
// already in the target system. Anything it can't convert cleanly is left as the
// author wrote it (returned as null so the caller falls back to the original).

import { formatAmount, splitQuantity, isRange } from './scale';

export type UnitSystem = 'original' | 'metric' | 'imperial';

// Unit word (lowercased, trailing "." stripped) → canonical key.
const UNIT_ALIASES: Record<string, string> = {
  cup: 'cup', cups: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp', tsps: 'tsp',
  'fl oz': 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  pint: 'pint', pints: 'pint', quart: 'quart', quarts: 'quart', gallon: 'gallon', gallons: 'gallon',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilogram: 'kg', kilograms: 'kg',
};

const VOLUME_ML: Record<string, number> = {
  cup: 236.588, tbsp: 14.787, tsp: 4.929, floz: 29.574,
  pint: 473.176, quart: 946.353, gallon: 3785.41, ml: 1, l: 1000,
};
const WEIGHT_G: Record<string, number> = { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 };
const METRIC = new Set(['ml', 'l', 'g', 'kg']);
const IMPERIAL_VOL = new Set(['cup', 'tbsp', 'tsp', 'floz', 'pint', 'quart', 'gallon']);
const IMPERIAL_WT = new Set(['oz', 'lb']);

function canon(unit: string | null | undefined): string | null {
  // The recipe schema allows an ingredient's unit to be null/omitted, so guard
  // before touching it — an unrecognized or missing unit is simply not converted.
  if (!unit) return null;
  return UNIT_ALIASES[unit.trim().toLowerCase().replace(/\.$/, '')] ?? null;
}

function pluralizeCup(value: number): string {
  return formatAmount(value) === '1' ? 'cup' : 'cups';
}

/** Format a metric quantity with a sensible precision. */
function formatMetric(value: number, unit: 'ml' | 'g' | 'l' | 'kg'): { amount: string; unit: string } {
  if (unit === 'l' || unit === 'kg') return { amount: String(Math.round(value * 100) / 100), unit };
  return { amount: String(Math.round(value)), unit };
}

/**
 * Convert a numeric value + unit into the target system. Returns display-ready
 * `{ amount, unit }` (English unit; caller localizes), or null when the unit is
 * not convertible or is already in the target system.
 */
export function convertMeasurement(
  value: number, unit: string | null | undefined, target: 'metric' | 'imperial',
): { amount: string; unit: string } | null {
  const c = canon(unit);
  if (c == null || !Number.isFinite(value) || value <= 0) return null;

  if (c in VOLUME_ML) {
    const ml = value * VOLUME_ML[c];
    if (target === 'metric') {
      if (METRIC.has(c)) return null;
      return ml >= 1000 ? formatMetric(ml / 1000, 'l') : formatMetric(ml, 'ml');
    }
    if (IMPERIAL_VOL.has(c)) return null;
    if (ml >= VOLUME_ML.cup * 0.25) { const v = ml / VOLUME_ML.cup; return { amount: formatAmount(v), unit: pluralizeCup(v) }; }
    if (ml >= VOLUME_ML.tbsp) return { amount: formatAmount(ml / VOLUME_ML.tbsp), unit: 'tbsp' };
    return { amount: formatAmount(ml / VOLUME_ML.tsp), unit: 'tsp' };
  }

  if (c in WEIGHT_G) {
    const g = value * WEIGHT_G[c];
    if (target === 'metric') {
      if (METRIC.has(c)) return null;
      return g >= 1000 ? formatMetric(g / 1000, 'kg') : formatMetric(g, 'g');
    }
    if (IMPERIAL_WT.has(c)) return null;
    const oz = g / WEIGHT_G.oz;
    return oz >= 16 ? { amount: formatAmount(oz / 16), unit: 'lb' } : { amount: formatAmount(oz), unit: 'oz' };
  }

  return null;
}

/**
 * Convert a scaled ingredient (amount string + unit) into the target system.
 * Skips ranges and qualified amounts ("2 large"). Returns null → use the
 * original scaled display.
 */
export function convertedIngredient(
  amount: string, unit: string | null | undefined, multiplier: number, target: 'metric' | 'imperial',
): { amount: string; unit: string } | null {
  if (!amount || isRange(amount)) return null;
  const q = splitQuantity(amount);
  if (!q || q.suffix) return null; // unparseable, or a qualifier we shouldn't convert
  const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return convertMeasurement(q.value * m, unit, target);
}

// A temperature must be marked as one — a degree sign or the word "degrees"
// before the C/F. Without that guard a bare letter is ambiguous: "1 C water"
// (1 cup) would otherwise be read as 1 °C and rewritten to "34°F water".
const F_TEMP = /(\d+)\s*(?:°\s*|degrees?\s+)F\b/gi;
const C_TEMP = /(\d+)\s*(?:°\s*|degrees?\s+)C\b/gi;

/** Convert temperatures written in instruction text (°F ⇄ °C). */
export function convertTemperatureInText(text: string, target: 'metric' | 'imperial'): string {
  if (!text) return text;
  if (target === 'metric') {
    return text.replace(F_TEMP, (_m, f: string) => `${Math.round((parseInt(f, 10) - 32) * 5 / 9)}°C`);
  }
  return text.replace(C_TEMP, (_m, cc: string) => `${Math.round(parseInt(cc, 10) * 9 / 5 + 32)}°F`);
}
