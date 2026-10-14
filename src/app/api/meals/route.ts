import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';
import { readJsonBody } from '@/lib/requestBody';
import { mealCreateSchema } from '@/lib/schemas';
import { slugify } from '@/lib/meals';
import { PG_UNIQUE_VIOLATION, revalidateMealPages, shoppingListFor } from '@/lib/mealsServer';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...NO_STORE, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Create a meal. The shopping list is built from the chosen recipes. */
export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, { status: parsed.status });
  // Validate + strip to known columns (blocks arbitrary-column injection).
  const valid = mealCreateSchema.safeParse(parsed.data);
  if (!valid.success) return json({ error: 'Invalid meal', issues: valid.error.issues }, { status: 422 });
  const input = valid.data;

  const slug = input.slug || slugify(input.title) || slugify(input.title_es ?? '') || `meal-${Date.now().toString(36)}`;

  const supabase = getServiceSupabase();
  const built = await shoppingListFor(supabase, input.recipe_ids);
  if (!built.ok) return json({ error: built.error }, { status: 500 });
  if (built.missing.length) return json({ error: 'Unknown recipe ids', missing: built.missing }, { status: 422 });

  const { data, error } = await supabase
    .from('meal_groups')
    .insert([{
      title: input.title,
      title_es: input.title_es ?? null,
      note: input.note ?? null,
      note_es: input.note_es ?? null,
      recipe_ids: input.recipe_ids,
      slug,
      shopping_list: built.list,
    }])
    .select('id,slug,title,title_es,note,note_es,recipe_ids')
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return json({ error: 'Slug already in use', slug }, { status: 409 });
    return json({ error: error.message }, { status: 500 });
  }

  revalidateMealPages([data?.slug]);
  return json({ meal: data }, { status: 201 });
}
