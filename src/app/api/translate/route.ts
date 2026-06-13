import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { buildSpanishFields } from '@/lib/translate';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, 'translate', { limit: 20, windowMs: 60_000 });
  if (limited) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });
  try {
    const { recipeId } = await req.json();
    if (!recipeId) return json({ error: 'recipeId required' }, { status: 400 });

    const supabase = getServiceSupabase();

    // Fetch the recipe
    const { data: recipeRow, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (fetchError || !recipeRow) {
      return json({ error: 'Recipe not found' }, { status: 404 });
    }

    // If already translated, return success immediately
    if (recipeRow.title_es && recipeRow.translated_at) {
      return json({ success: true, cached: true });
    }

    // Distinguish "translation not configured" from a genuine failure so the
    // client gets an accurate status rather than a misleading parse error.
    if (!process.env.ANTHROPIC_API_KEY) {
      return json({ error: 'Translation is not configured' }, { status: 503 });
    }

    const spanishFields = await buildSpanishFields(recipeRow);
    if (!spanishFields) {
      return json({ error: 'Could not generate a valid translation' }, { status: 502 });
    }

    // Write to Supabase
    const { error: updateError } = await supabase
      .from('recipes')
      .update(spanishFields)
      .eq('id', recipeId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return json({ error: 'Failed to save translation' }, { status: 500 });
    }

    return json({ success: true });
  } catch (err) {
    console.error('Translate error:', err);
    return json({ error: 'Translation failed' }, { status: 500 });
  }
}
