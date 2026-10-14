import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CORS_HEADERS } from '@/lib/cors';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Light list of every recipe (id + titles + cover) for the meal editor's picker.
 * Public data (recipes are public), so no auth; kept separate from GET /api/recipes
 * because that returns whole rows (steps, ingredients, ...).
 */
export async function GET() {
  const { data, error } = await getSupabase()
    .from('recipes')
    .select('id,title,title_es,image_url')
    .order('title', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  return NextResponse.json(
    { recipes: data ?? [] },
    { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store, must-revalidate' } },
  );
}
