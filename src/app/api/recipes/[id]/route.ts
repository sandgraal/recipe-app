import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getServiceSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';
import { readJsonBody } from '@/lib/requestBody';
import { recipeUpdateSchema } from '@/lib/schemas';

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
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, { status: parsed.status });
  // Validate + strip to known columns (blocks arbitrary-column injection).
  const valid = recipeUpdateSchema.safeParse(parsed.data);
  if (!valid.success) return json({ error: 'Invalid recipe', issues: valid.error.issues }, { status: 422 });
  const supabase = getServiceSupabase();
  const { id } = await params;
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...valid.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ recipe: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getServiceSupabase();
  const { id } = await params;
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ success: true });
}
