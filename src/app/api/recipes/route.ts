import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const cuisine = searchParams.get('cuisine');
  const tag = searchParams.get('tag');

  let query = supabase.from('recipes').select('*').order('created_at', { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,cuisine.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (cuisine) {
    query = query.ilike('cuisine', cuisine);
  }
  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data, error } = await query;
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ recipes: data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  const { data, error } = await supabase.from('recipes').insert([body]).select().single();
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ recipe: data }, { status: 201 });
}
