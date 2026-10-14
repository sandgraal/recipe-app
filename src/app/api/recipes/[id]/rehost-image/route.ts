import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';
import { rehostImage, type RehostFailure } from '@/lib/rehostImage';
import { computeThumbhashFromUrl } from '@/lib/thumbhashServer';
import { revalidateMealPages } from '@/lib/mealsServer';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...NO_STORE, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const STATUS: Record<RehostFailure, number> = {
  blocked: 422, not_image: 422, too_large: 422, fetch_failed: 502, upload_failed: 502,
};

/**
 * Admin only. Copy this recipe's hotlinked cover photo into our own storage and
 * point the recipe at the copy (with a fresh ThumbHash). A cover that is already
 * ours is left alone. Nothing is changed unless the copy succeeded.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await checkRateLimit(req, 'rehost-image', { limit: 30, windowMs: 60_000 });
  if (limited) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });

  const { id } = await params;
  const supabase = getServiceSupabase();
  const { data: row, error: readError } = await supabase.from('recipes').select('id,image_url').eq('id', id).maybeSingle();
  if (readError) return json({ error: readError.message }, { status: 500 });
  if (!row) return json({ error: 'Recipe not found' }, { status: 404 });
  const current = (row as { image_url?: string | null }).image_url;
  if (!current) return json({ error: 'This recipe has no photo' }, { status: 422 });

  const hosted = await rehostImage(current, supabase);
  if (!hosted.ok) return json({ error: 'Could not copy the photo', reason: hosted.reason }, { status: STATUS[hosted.reason] });
  if (hosted.unchanged) return json({ recipe: { id, image_url: hosted.url }, unchanged: true });

  const image_thumbhash = await computeThumbhashFromUrl(hosted.url);
  const { error } = await supabase
    .from('recipes')
    .update({ image_url: hosted.url, image_thumbhash, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return json({ error: error.message }, { status: 500 });
  revalidateMealPages();
  return json({ recipe: { id, image_url: hosted.url, image_thumbhash } });
}
