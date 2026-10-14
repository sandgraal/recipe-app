import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';
import { readJsonBody } from '@/lib/requestBody';
import { mealUpdateSchema } from '@/lib/schemas';
import { sameRecipeSet } from '@/lib/meals';
import { PG_UNIQUE_VIOLATION, revalidateMealPages, shoppingListFor } from '@/lib/mealsServer';
import { logger } from '@/lib/logger';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...NO_STORE, ...((init?.headers as Record<string, string>) || {}) } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Edit a meal. Rebuilds the shopping list when the set of recipes changes. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'Meal not found' }, { status: 404 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, { status: parsed.status });
  // Validate + strip to known columns (blocks arbitrary-column injection).
  const valid = mealUpdateSchema.safeParse(parsed.data);
  if (!valid.success) return json({ error: 'Invalid meal', issues: valid.error.issues }, { status: 422 });

  // Drop undefined keys so a partial edit never overwrites what it did not send.
  const patch: Record<string, unknown> = Object.fromEntries(
    Object.entries(valid.data).filter(([, v]) => v !== undefined),
  );
  if (!Object.keys(patch).length) return json({ error: 'Nothing to update' }, { status: 422 });

  const supabase = getServiceSupabase();
  const { data: existing, error: readErr } = await supabase
    .from('meal_groups')
    .select('id,slug,recipe_ids')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return json({ error: readErr.message }, { status: 500 });
  if (!existing) return json({ error: 'Meal not found' }, { status: 404 });

  const newIds = valid.data.recipe_ids;
  if (newIds) {
    const oldIds = Array.isArray(existing.recipe_ids) ? (existing.recipe_ids as string[]) : [];
    const built = await shoppingListFor(supabase, newIds);
    if (!built.ok) return json({ error: built.error }, { status: 500 });
    if (built.missing.length) return json({ error: 'Unknown recipe ids', missing: built.missing }, { status: 422 });
    // Same recipes (maybe only re-ordered): keep the saved list exactly as it is.
    if (!sameRecipeSet(oldIds, newIds)) patch.shopping_list = built.list;
  }

  const { data, error } = await supabase
    .from('meal_groups')
    .update(patch)
    .eq('id', id)
    .select('id,slug,title,title_es,note,note_es,recipe_ids')
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return json({ error: 'Slug already in use', slug: valid.data.slug }, { status: 409 });
    return json({ error: error.message }, { status: 500 });
  }

  revalidateMealPages([existing.slug, data?.slug]);
  return json({ meal: data });
}

/**
 * Delete a meal. The full row is copied into meal_groups_archive FIRST; if that
 * copy fails nothing is deleted. (Restore steps are in the archive migration.)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'Meal not found' }, { status: 404 });
  const supabase = getServiceSupabase();

  const { data: row, error: readErr } = await supabase.from('meal_groups').select('*').eq('id', id).maybeSingle();
  if (readErr) return json({ error: readErr.message }, { status: 500 });
  if (!row) return json({ error: 'Meal not found' }, { status: 404 });

  // The archive's primary key is the slug. If this slug was archived before
  // (a meal deleted, re-made with the same address, deleted again) keep BOTH
  // copies by suffixing the key rather than overwriting the older one.
  const baseSlug: string = row.slug || row.id;
  const archive = (slug: string) =>
    supabase.from('meal_groups_archive').insert([{ slug, row, reason: 'deleted from the app (admin)' }]);
  let { error: archiveErr } = await archive(baseSlug);
  if (archiveErr?.code === PG_UNIQUE_VIOLATION) {
    ({ error: archiveErr } = await archive(`${baseSlug}-${Date.now()}`));
  }
  if (archiveErr) {
    logger.error('meals: archive failed, meal NOT deleted', { id, err: archiveErr.message });
    return json({ error: 'Could not archive the meal, so it was not deleted' }, { status: 500 });
  }

  const { error } = await supabase.from('meal_groups').delete().eq('id', id);
  if (error) return json({ error: error.message }, { status: 500 });

  revalidateMealPages([row.slug]);
  return json({ success: true });
}
