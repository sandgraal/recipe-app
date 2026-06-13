import { getSupabase } from '@/lib/supabase';
import { Recipe, RecipeCardData } from '@/lib/types';
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

/** Trimmed card rows for listings. */
export async function getRecipeCards(): Promise<RecipeCardData[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('recipes')
    .select(CARD_FIELDS)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as RecipeCardData[];
}

export async function getAllRecipeIds(): Promise<string[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('recipes').select('id');
  if (error || !data) return [];
  return (data as { id: string }[]).map(r => r.id);
}
