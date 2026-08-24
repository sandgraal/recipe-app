// Structured recipe taxonomy — the controlled vocabulary and the derivation
// logic that backfills it for existing recipes.
//
// Design decisions (locked with the owner):
//  - `category` and `difficulty` are controlled (enforced by CHECK constraints
//    in the migration); `region` and `dietary` are open text/text[] but seeded
//    from these lists for the admin datalist and ES localization.
//  - Region is country-level at its finest — never sub-national. "Costa Rican"
//    (and its sub-styles like "Costa Rican (Caribbean)") stays a *cuisine*;
//    the *region* is simply "Costa Rica".
//  - Controlled-vocab Spanish labels live here (single source of truth) and are
//    re-exported through i18n's localize* helpers.

import { parseMinutes } from './time';

// ── Canonical vocabulary ──────────────────────────────────────────────────────

export const RECIPE_CATEGORIES = [
  'Mains', 'Sides', 'Soups', 'Salads', 'Breakfast', 'Desserts',
  'Drinks', 'Sauces', 'Preserves', 'Snacks', 'Appetizers', 'Breads',
] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIETARY_FLAGS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'pescatarian', 'keto',
] as const;
export type DietaryFlag = (typeof DIETARY_FLAGS)[number];

// Region is free text, but these seed the admin datalist + ES map. Country-level
// (or broader multi-country areas) only — never finer than a country.
export const SUGGESTED_REGIONS = [
  'Costa Rica', 'Caribbean', 'Mexico', 'Nicaragua', 'Colombia', 'Peru', 'Brazil',
  'United States', 'Italy', 'Spain', 'France', 'Mediterranean', 'Middle East',
  'India', 'China', 'Korea', 'Japan', 'Thailand', 'Vietnam', 'Philippines', 'West Africa',
] as const;

// ── Spanish labels (lowercased keys; single source of truth) ──────────────────

export const RECIPE_CATEGORY_ES: Record<string, string> = {
  mains: 'Platos Fuertes', sides: 'Acompañamientos', soups: 'Sopas', salads: 'Ensaladas',
  breakfast: 'Desayuno', desserts: 'Postres', drinks: 'Bebidas', sauces: 'Salsas',
  preserves: 'Conservas', snacks: 'Bocadillos', appetizers: 'Entradas', breads: 'Panes',
};

export const REGION_ES: Record<string, string> = {
  'costa rica': 'Costa Rica', caribbean: 'Caribe', mexico: 'México', nicaragua: 'Nicaragua',
  colombia: 'Colombia', peru: 'Perú', brazil: 'Brasil', 'united states': 'Estados Unidos',
  italy: 'Italia', spain: 'España', france: 'Francia', mediterranean: 'Mediterráneo',
  'middle east': 'Medio Oriente', india: 'India', china: 'China', korea: 'Corea',
  japan: 'Japón', thailand: 'Tailandia', vietnam: 'Vietnam', philippines: 'Filipinas',
  'west africa': 'África Occidental',
};

export const DIFFICULTY_ES: Record<string, string> = {
  easy: 'Fácil', medium: 'Media', hard: 'Difícil',
};

export const DIETARY_ES: Record<string, string> = {
  vegetarian: 'Vegetariano', vegan: 'Vegano', 'gluten-free': 'Sin Gluten',
  'dairy-free': 'Sin Lácteos', pescatarian: 'Pescetariano', keto: 'Keto',
};

// ── Derivation (backfill) ─────────────────────────────────────────────────────

// Aligned with CONDIMENT_TAGS in ingredientLinks.ts. Backfill sets `category`
// from these but NEVER removes the tags themselves — ingredient auto-linking
// (getIngredientLinkCandidateRecipes) keys off the tags, so they must survive.
const PRESERVE_TAGS = new Set(['Preserves', 'Fermented']);
const SAUCE_TAGS = new Set(['Condiments', 'Condiment', 'Sauces']);

const TAG_TO_CATEGORY: Record<string, RecipeCategory> = {
  mains: 'Mains', main: 'Mains',
  sides: 'Sides', side: 'Sides',
  soups: 'Soups', soup: 'Soups',
  salads: 'Salads', salad: 'Salads',
  breakfast: 'Breakfast',
  desserts: 'Desserts', dessert: 'Desserts', cake: 'Desserts', candy: 'Desserts',
  drinks: 'Drinks', drink: 'Drinks', beverage: 'Drinks',
  snacks: 'Snacks', snack: 'Snacks',
  appetizers: 'Appetizers', appetizer: 'Appetizers',
  breads: 'Breads', bread: 'Breads',
};

/** Best-effort category from a recipe's tags. Sauces/preserves win first. */
export function deriveCategory(tags: string[] | null | undefined): RecipeCategory | null {
  const list = tags ?? [];
  if (list.some(t => PRESERVE_TAGS.has(t))) return 'Preserves';
  if (list.some(t => SAUCE_TAGS.has(t))) return 'Sauces';
  for (const t of list) {
    const c = TAG_TO_CATEGORY[t.trim().toLowerCase()];
    if (c) return c;
  }
  return null;
}

const CUISINE_TO_REGION: Record<string, string> = {
  'costa rican': 'Costa Rica',
  'costa rican (caribbean)': 'Costa Rica',
  'costa rican (chinese)': 'Costa Rica',
  caribbean: 'Caribbean',
  italian: 'Italy', mexican: 'Mexico', peruvian: 'Peru', spanish: 'Spain',
  american: 'United States', korean: 'Korea', chinese: 'China', thai: 'Thailand',
  japanese: 'Japan', vietnamese: 'Vietnam', colombian: 'Colombia', nicaraguan: 'Nicaragua',
  french: 'France', indian: 'India', filipino: 'Philippines', 'middle eastern': 'Middle East',
  mediterranean: 'Mediterranean', brazilian: 'Brazil', 'west african': 'West Africa',
};

/** Country-level region from a free-text cuisine (never sub-national). */
export function deriveRegion(cuisine: string | null | undefined): string | null {
  if (!cuisine) return null;
  return CUISINE_TO_REGION[cuisine.trim().toLowerCase()] ?? null;
}

const TAG_TO_DIETARY: Record<string, DietaryFlag> = {
  vegetarian: 'vegetarian', vegan: 'vegan',
  'gluten-free': 'gluten-free', 'gluten free': 'gluten-free',
  'dairy-free': 'dairy-free', 'dairy free': 'dairy-free',
  pescatarian: 'pescatarian', pescetarian: 'pescatarian', keto: 'keto',
};

/** Conservative dietary flags — only from explicit tags, never inferred from
 *  ingredients (a false "gluten-free" is worse than a missing one). */
export function deriveDietary(tags: string[] | null | undefined): DietaryFlag[] {
  const out = new Set<DietaryFlag>();
  for (const t of tags ?? []) {
    const d = TAG_TO_DIETARY[t.trim().toLowerCase()];
    if (d) out.add(d);
  }
  return [...out];
}

/** First-pass difficulty from step count + total minutes. */
export function deriveDifficulty(stepCount: number, totalMinutes: number | null): Difficulty {
  if (totalMinutes != null) {
    if (stepCount <= 5 && totalMinutes < 30) return 'easy';
    if (stepCount > 12 || totalMinutes > 90) return 'hard';
    return 'medium';
  }
  if (stepCount <= 5) return 'easy';
  if (stepCount > 12) return 'hard';
  return 'medium';
}

// ── Idempotent patch builder (used by the backfill route + tests) ─────────────

export interface TaxonomyPatchInput {
  tags?: string[] | null;
  cuisine?: string | null;
  steps?: { order: number; text: string }[] | null;
  total_time?: string | null;
  category?: string | null;
  region?: string | null;
  dietary?: string[] | null;
  difficulty?: string | null;
  total_time_min?: number | null;
}

/**
 * Compute the taxonomy columns to write for one recipe, filling ONLY fields
 * that are currently empty. Returns an empty object when nothing needs changing,
 * so re-running the backfill is a no-op. Never returns `tags`.
 */
export function buildTaxonomyPatch(r: TaxonomyPatchInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (r.category == null) {
    const c = deriveCategory(r.tags);
    if (c) patch.category = c;
  }
  if (r.region == null) {
    const rg = deriveRegion(r.cuisine);
    if (rg) patch.region = rg;
  }
  if (!r.dietary || r.dietary.length === 0) {
    const d = deriveDietary(r.tags);
    if (d.length) patch.dietary = d;
  }

  const mins = r.total_time_min ?? parseMinutes(r.total_time);
  if (r.total_time_min == null && mins != null) patch.total_time_min = mins;
  if (r.difficulty == null) patch.difficulty = deriveDifficulty((r.steps ?? []).length, mins);

  return patch;
}
