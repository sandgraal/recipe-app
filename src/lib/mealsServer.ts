import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mealPaths } from '@/lib/meals';
import { buildShoppingList, type RecipeIngredients } from '@/lib/shoppingList';
import type { ShoppingAisle } from '@/lib/types';
import { logger } from '@/lib/logger';

/** Postgres unique_violation. */
export const PG_UNIQUE_VIOLATION = '23505';

/**
 * Refresh every cached page that shows meals: both meals lists, the meal's own
 * pages (old and new slug), the home pages (meals showcase) and every recipe
 * page (its "Make it a meal" card). Never throws: a failed refresh must not turn
 * a successful write into an error (the pages also revalidate hourly).
 */
export function revalidateMealPages(slugs: Array<string | null | undefined> = []) {
  try {
    for (const p of mealPaths(slugs)) revalidatePath(p);
    revalidatePath('/[lang]/recipes/[id]', 'page');
  } catch (err) {
    logger.error('meals: revalidate failed', { err: String(err) });
  }
}

/** Fetch the recipes' ingredients (in the order of `ids`) and build the aisle-grouped list. */
export async function shoppingListFor(
  supabase: SupabaseClient,
  ids: string[],
): Promise<{ ok: true; list: ShoppingAisle[]; missing: string[] } | { ok: false; error: string }> {
  if (!ids.length) return { ok: true, list: [], missing: [] };
  const { data, error } = await supabase.from('recipes').select('id,ingredients,ingredients_es').in('id', ids);
  if (error) return { ok: false, error: error.message };
  const byId = new Map((data ?? []).map((r: { id: string } & RecipeIngredients) => [r.id, r]));
  const missing = ids.filter(id => !byId.has(id));
  const ordered = ids.map(id => byId.get(id)).filter((r): r is { id: string } & RecipeIngredients => !!r);
  return { ok: true, list: buildShoppingList(ordered), missing };
}

/**
 * Integrity: after a recipe is deleted, drop its id from every meal that listed
 * it (36 broken links built up before this existed) and rebuild those meals'
 * shopping lists from the recipes that remain. Best-effort per meal.
 */
export async function removeRecipeFromMeals(
  supabase: SupabaseClient,
  recipeId: string,
): Promise<{ ok: boolean; updated: number; slugs: string[] }> {
  // meal_groups is a small curated table: fetch all and match in JS (a jsonb `cs`
  // filter is awkward through supabase-js; see getMealGroupsForRecipe).
  const { data, error } = await supabase.from('meal_groups').select('id,slug,recipe_ids');
  if (error) {
    logger.error('meals: could not read meals to clean up a deleted recipe', { recipeId, err: error.message });
    return { ok: false, updated: 0, slugs: [] };
  }
  const affected = (data ?? []).filter(
    (m: { recipe_ids: unknown }) => Array.isArray(m.recipe_ids) && m.recipe_ids.includes(recipeId),
  ) as Array<{ id: string; slug: string | null; recipe_ids: string[] }>;
  let ok = true;
  const slugs: string[] = [];
  let updated = 0;
  for (const m of affected) {
    const rest = m.recipe_ids.filter(x => x !== recipeId);
    const built = await shoppingListFor(supabase, rest);
    const patch: Record<string, unknown> = { recipe_ids: rest };
    // Only touch the saved list if we could rebuild it; otherwise leave it as it was.
    if (built.ok) patch.shopping_list = built.list;
    const { error: upErr } = await supabase.from('meal_groups').update(patch).eq('id', m.id);
    if (upErr) {
      ok = false;
      logger.error('meals: could not remove a deleted recipe from a meal', { mealId: m.id, recipeId, err: upErr.message });
      continue;
    }
    updated += 1;
    if (m.slug) slugs.push(m.slug);
  }
  return { ok, updated, slugs };
}
