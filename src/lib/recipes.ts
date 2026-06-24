import { getSupabase } from '@/lib/supabase';
import { Recipe, MealGroup, MealGroupSibling } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Fail soft if Supabase env isn't available (e.g. a build without DB access):
// callers get empty/null and pages render dynamically via ISR instead of failing.
function client(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

/**
 * Server-side data access for recipes. Used by Server Components so recipe
 * content is rendered into the initial HTML (for crawlers + AI) instead of being
 * fetched client-side. Reads use the anon key (public SELECT is allowed post-lock).
 */

// Card listing needs far less than the full row — dropping steps/ingredients/notes
// (the bulk of the payload) keeps the home page light.
const CARD_FIELDS = 'id,title,title_es,image_url,cuisine,tags,tags_es,total_time,servings,created_at';

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c.from('recipes').select('*').eq('id', id).single();
  if (error) return null;
  return (data as Recipe) ?? null;
}

/** Trimmed card rows for listings (cast to Recipe — only card fields are read). */
export async function getRecipeCards(): Promise<Recipe[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('recipes')
    .select(CARD_FIELDS)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as unknown as Recipe[];
}

export async function getAllRecipeIds(): Promise<string[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('recipes').select('id');
  if (error || !data) return [];
  return (data as { id: string }[]).map(r => r.id);
}

/** The meal group this recipe belongs to (if any), with the OTHER members
 *  resolved to card summaries for linking. Returns null if it's not in a group. */
export async function getMealGroupForRecipe(recipeId: string): Promise<MealGroup | null> {
  const c = client();
  if (!c) return null;
  // meal_groups is a small curated table — fetch all and match in JS. (A
  // PostgREST jsonb `cs` filter works, but supabase-js's .contains() serializes
  // a JS array as a Postgres array literal `{…}`, which never matches jsonb.)
  const { data, error } = await c
    .from('meal_groups')
    .select('id,title,title_es,note,note_es,recipe_ids');
  if (error || !data?.length) return null;
  const groups = data as Array<{
    id: string; title: string; title_es: string | null;
    note: string | null; note_es: string | null; recipe_ids: string[];
  }>;
  const g = groups.find(grp => Array.isArray(grp.recipe_ids) && grp.recipe_ids.includes(recipeId));
  if (!g) return null;
  const others = g.recipe_ids.filter(x => x !== recipeId);
  if (!others.length) return null;
  const { data: sibs } = await c
    .from('recipes')
    .select('id,title,title_es,image_url')
    .in('id', others);
  const byId = new Map((sibs as MealGroupSibling[] | null ?? []).map(s => [s.id, s]));
  // Preserve the curated order from recipe_ids.
  const siblings = others
    .map(id => byId.get(id))
    .filter((s): s is MealGroupSibling => !!s);
  if (!siblings.length) return null;
  return { id: g.id, title: g.title, title_es: g.title_es, note: g.note, note_es: g.note_es, siblings };
}
