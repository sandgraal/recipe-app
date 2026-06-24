import { getSupabase } from '@/lib/supabase';
import { Recipe, MealGroup, MealGroupSibling, Meal, ShoppingAisle } from '@/lib/types';
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

/** All meal groups this recipe belongs to (a recipe can be in several), each
 *  with the OTHER members resolved to card summaries for linking. */
export async function getMealGroupsForRecipe(recipeId: string): Promise<MealGroup[]> {
  const c = client();
  if (!c) return [];
  // meal_groups is a small curated table — fetch all and match in JS. (A
  // PostgREST jsonb `cs` filter works, but supabase-js's .contains() serializes
  // a JS array as a Postgres array literal `{…}`, which never matches jsonb.)
  const { data, error } = await c
    .from('meal_groups')
    .select('id,slug,title,title_es,note,note_es,recipe_ids,created_at')
    .order('created_at', { ascending: true });
  if (error || !data?.length) return [];
  const groups = data as Array<{
    id: string; slug: string | null; title: string; title_es: string | null;
    note: string | null; note_es: string | null; recipe_ids: string[];
  }>;
  const mine = groups.filter(g => Array.isArray(g.recipe_ids) && g.recipe_ids.includes(recipeId));
  if (!mine.length) return [];
  // Resolve every sibling across all matched groups in one query.
  const otherIds = [...new Set(mine.flatMap(g => g.recipe_ids.filter(x => x !== recipeId)))];
  const { data: sibs } = await c
    .from('recipes')
    .select('id,title,title_es,image_url')
    .in('id', otherIds);
  const byId = new Map((sibs as MealGroupSibling[] | null ?? []).map(s => [s.id, s]));
  return mine
    .map(g => ({
      id: g.id, slug: g.slug, title: g.title, title_es: g.title_es, note: g.note, note_es: g.note_es,
      // Preserve the curated order from recipe_ids.
      siblings: g.recipe_ids
        .filter(x => x !== recipeId)
        .map(id => byId.get(id))
        .filter((s): s is MealGroupSibling => !!s),
    }))
    .filter(g => g.siblings.length > 0);
}

/** All meal slugs (for generateStaticParams on the meal pages). */
export async function getAllMealSlugs(): Promise<string[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('meal_groups').select('slug').not('slug', 'is', null);
  if (error || !data) return [];
  return (data as { slug: string | null }[]).map(r => r.slug).filter((s): s is string => !!s);
}

/** A full meal by slug: the group, its member recipes (in curated order), and
 *  the stored consolidated shopping list. */
export async function getMealBySlug(slug: string): Promise<Meal | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c
    .from('meal_groups')
    .select('id,slug,title,title_es,note,note_es,recipe_ids,shopping_list')
    .eq('slug', slug)
    .limit(1);
  if (error || !data?.length) return null;
  const g = data[0] as {
    id: string; slug: string; title: string; title_es: string | null;
    note: string | null; note_es: string | null; recipe_ids: string[];
    shopping_list: ShoppingAisle[] | null;
  };
  const ids = Array.isArray(g.recipe_ids) ? g.recipe_ids : [];
  const { data: recs } = await c
    .from('recipes')
    .select('id,title,title_es,image_url')
    .in('id', ids);
  const byId = new Map((recs as MealGroupSibling[] | null ?? []).map(r => [r.id, r]));
  const recipes = ids.map(id => byId.get(id)).filter((r): r is MealGroupSibling => !!r);
  return {
    id: g.id, slug: g.slug, title: g.title, title_es: g.title_es, note: g.note, note_es: g.note_es,
    recipes,
    shoppingList: Array.isArray(g.shopping_list) ? g.shopping_list : [],
  };
}
