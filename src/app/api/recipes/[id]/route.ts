import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Always serve fresh data so edits/deletes reflect immediately.
const NO_STORE = { 'Cache-Control': 'no-store, must-revalidate' };

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...NO_STORE, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const { id } = await params;
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
  if (error) return json({ error: error.message }, { status: 404 });
  return json({ recipe: data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ recipe: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const { id } = await params;
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ success: true });
}
