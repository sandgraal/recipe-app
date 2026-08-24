import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getServiceSupabase } from '@/lib/supabase';
import { buildSpanishFields } from '@/lib/translate';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';
import { readJsonBody } from '@/lib/requestBody';
import { recipeCreateSchema } from '@/lib/schemas';
import { parseFilter, applyRecipeFilters } from '@/lib/browse';
import { logger } from '@/lib/logger';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...NO_STORE, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const f = parseFilter(Object.fromEntries(searchParams));

  // When searching, go through the search_recipes() SQL function so the query
  // also matches ingredient names (in both languages), not just title/cuisine/
  // description. It returns `setof recipes`, so all facet filters chain on top.
  // When searching, preserve the RPC's relevance (ts_rank) order — don't force
  // created_at. Non-search listings stay newest-first.
  const base = f.q
    ? supabase.rpc('search_recipes', { q: f.q })
    : supabase.from('recipes').select('*').order('created_at', { ascending: false });

  const { data, error } = await applyRecipeFilters(base, f);
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ recipes: data });
}

export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, { status: parsed.status });
  // Validate + strip to known columns (blocks arbitrary-column injection).
  const valid = recipeCreateSchema.safeParse(parsed.data);
  if (!valid.success) return json({ error: 'Invalid recipe', issues: valid.error.issues }, { status: 422 });
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('recipes').insert([valid.data]).select().single();
  if (error) return json({ error: error.message }, { status: 500 });

  // Auto-translate to Spanish on creation so new recipes are bilingual
  // immediately. Best-effort: if translation is unavailable or fails, the
  // recipe still publishes and falls back to on-demand translation in the UI.
  let recipe = data;
  if (data && !data.title_es) {
    try {
      const spanishFields = await buildSpanishFields(data);
      if (spanishFields) {
        const { data: updated, error: updateError } = await supabase
          .from('recipes')
          .update(spanishFields)
          .eq('id', data.id)
          .select()
          .single();
        if (updateError) {
          logger.error('recipes: auto-translate save failed', { id: data.id, err: updateError.message });
        } else if (updated) {
          recipe = updated;
        }
      }
    } catch (err) {
      logger.error('recipes: auto-translate on create failed', { err: String(err) });
    }
  }

  return json({ recipe }, { status: 201 });
}
