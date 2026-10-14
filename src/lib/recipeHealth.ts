/**
 * Pure classification for the admin "Recipe health" page: which recipes and
 * meals have gaps worth fixing. No I/O here; the page fetches the public
 * columns and hands them in.
 */
import { isExternalImageUrl } from '@/lib/imageHost';
import { timeNeedsSpanish } from '@/lib/i18n';
import { dietaryConflicts, type DietaryConflict } from '@/lib/dietaryConflicts';

/** A recipe with this many ingredients or fewer counts as "very short". */
export const SHORT_INGREDIENT_MAX = 2;
/** A meal needs at least this many recipes to be a meal. */
export const MIN_MEAL_RECIPES = 3;

export type RecipeIssue =
  | 'no_cover'
  | 'external_photo'
  | 'no_title_es'
  | 'no_time_es'
  | 'no_steps_es'
  | 'no_region'
  | 'no_category'
  | 'no_dietary'
  | 'dietary_conflict'
  | 'short_ingredients';

export const RECIPE_ISSUES: RecipeIssue[] = [
  'no_cover', 'external_photo', 'no_title_es', 'no_time_es', 'no_steps_es', 'no_region', 'no_category', 'no_dietary', 'dietary_conflict', 'short_ingredients',
];

export type MealIssue = 'few_recipes' | 'missing_recipes';

/** The columns the health check reads from `recipes` (all optional: rows may be partial). */
export interface HealthRecipe {
  id: string;
  title: string;
  title_es?: string | null;
  image_url?: string | null;
  total_time?: string | null;
  region?: string | null;
  category?: string | null;
  dietary?: string[] | null;
  ingredients?: unknown[] | null;
  ingredients_es?: unknown[] | null;
  steps?: unknown[] | null;
  steps_es?: unknown[] | null;
}

/** The columns the health check reads from `meal_groups`. */
export interface HealthMeal {
  id: string;
  slug?: string | null;
  title: string;
  title_es?: string | null;
  recipe_ids?: string[] | null;
}

export interface RecipeHealthRow {
  id: string;
  title: string;
  title_es?: string | null;
  issues: RecipeIssue[];
  /** Dietary labels that contradict an ingredient line (empty unless `dietary_conflict` is an issue). */
  conflicts: DietaryConflict[];
}

export interface MealHealthRow {
  id: string;
  slug: string | null;
  title: string;
  /** Recipes the meal points at that actually exist. */
  recipeCount: number;
  /** Recipe ids the meal points at that no longer exist. */
  missingIds: string[];
  issues: MealIssue[];
}

const blank = (s: string | null | undefined) => !s || !s.trim();
const emptyList = (a: unknown[] | null | undefined) => !Array.isArray(a) || a.length === 0;

/** Dietary labels that contradict the ingredients (English and Spanish lines both checked). */
export function recipeConflicts(r: HealthRecipe): DietaryConflict[] {
  return dietaryConflicts(r.dietary, [...(r.ingredients ?? []), ...(r.ingredients_es ?? [])]);
}

/** Problems with one recipe, in a stable order (empty = healthy). */
export function recipeIssues(r: HealthRecipe): RecipeIssue[] {
  const out: RecipeIssue[] = [];
  if (blank(r.image_url)) out.push('no_cover');
  if (isExternalImageUrl(r.image_url)) out.push('external_photo');
  if (blank(r.title_es)) out.push('no_title_es');
  // A time the Spanish view cannot fully translate (no time_es column exists yet).
  if (timeNeedsSpanish(r.total_time)) out.push('no_time_es');
  // Only a recipe that has English steps can be missing their Spanish version.
  if (!emptyList(r.steps) && emptyList(r.steps_es)) out.push('no_steps_es');
  if (blank(r.region)) out.push('no_region');
  if (blank(r.category)) out.push('no_category');
  if (emptyList(r.dietary)) out.push('no_dietary');
  if (recipeConflicts(r).length > 0) out.push('dietary_conflict');
  if (!Array.isArray(r.ingredients) || r.ingredients.length <= SHORT_INGREDIENT_MAX) out.push('short_ingredients');
  return out;
}

/** Only the recipes that have at least one issue, sorted by title. */
export function classifyRecipes(recipes: HealthRecipe[]): RecipeHealthRow[] {
  return recipes
    .map(r => {
      const issues = recipeIssues(r);
      return {
        id: r.id, title: r.title, title_es: r.title_es ?? null, issues,
        conflicts: issues.includes('dietary_conflict') ? recipeConflicts(r) : [],
      };
    })
    .filter(r => r.issues.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Problems with one meal, given the ids of every recipe that exists. */
export function mealIssues(m: HealthMeal, existing: ReadonlySet<string>): MealHealthRow {
  const ids = Array.isArray(m.recipe_ids) ? m.recipe_ids : [];
  const missingIds = ids.filter(id => !existing.has(id));
  const recipeCount = ids.length - missingIds.length;
  const issues: MealIssue[] = [];
  if (recipeCount < MIN_MEAL_RECIPES) issues.push('few_recipes');
  if (missingIds.length > 0) issues.push('missing_recipes');
  return { id: m.id, slug: m.slug ?? null, title: m.title, recipeCount, missingIds, issues };
}

/** Only the meals that have at least one issue, sorted by title. */
export function classifyMeals(meals: HealthMeal[], recipeIds: Iterable<string>): MealHealthRow[] {
  const existing = new Set(recipeIds);
  return meals
    .map(m => mealIssues(m, existing))
    .filter(m => m.issues.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** How many recipes have each issue (every issue present, zero included). */
export function countByIssue(rows: RecipeHealthRow[]): Record<RecipeIssue, number> {
  const counts = Object.fromEntries(RECIPE_ISSUES.map(i => [i, 0])) as Record<RecipeIssue, number>;
  for (const r of rows) for (const i of r.issues) counts[i]++;
  return counts;
}
