import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';
import { extractRecipe } from '@/lib/importRecipe';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await checkRateLimit(req, 'import-photo', { limit: 15, windowMs: 60_000 });
  if (limited) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });
  const client = new Anthropic();
  const supabase = getSupabase();

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return json({ error: 'Image required' }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return json({ error: 'Image too large (max 10 MB)' }, { status: 413 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  // Upload to Supabase storage
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `recipe-photo-${Date.now()}.${ext}`;
  let imageUrl: string | undefined;
  const { error: uploadError } = await supabase.storage
    .from('recipe-images')
    .upload(path, buffer, { contentType: mediaType, upsert: true });
  if (!uploadError) {
    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path);
    imageUrl = data.publicUrl;
  }

  const result = await extractRecipe(client, 'import/photo', [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
    {
      type: 'text',
      text: 'This is a photo of a recipe card or recipe page. Extract the complete recipe, reading every ingredient and step. Use null for anything the photo does not show. "order" counts the steps from 1.',
    },
  ], 'Could not parse recipe from image');
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  const recipe = result.recipe;
  recipe.source_type = 'photo';
  if (imageUrl) recipe.image_url = imageUrl;
  return json({ recipe });
}

// Haiku 5.5 thinks briefly before answering; a photo or page import can take longer than the default limit.
export const maxDuration = 60;
