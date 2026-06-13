import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const limited = checkRateLimit(req, 'import-photo', { limit: 15, windowMs: 60_000 });
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

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `This is a photo of a recipe card or recipe page. Extract the complete recipe and return ONLY a JSON object with these exact fields (no markdown, no explanation):
{
  "title": string,
  "description": string or null,
  "servings": number or null,
  "total_time": string or null,
  "cuisine": string or null,
  "tags": string[],
  "ingredients": [{"amount": string, "unit": string, "item": string, "notes": string or null}],
  "steps": [{"order": number, "text": string}],
  "notes": string or null
}`,
        },
      ],
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return json({ error: 'Could not parse recipe from image' }, { status: 422 });

  try {
    const recipe = JSON.parse(jsonMatch[0]);
    recipe.source_type = 'photo';
    recipe.tags = recipe.tags || [];
    recipe.ingredients = recipe.ingredients || [];
    recipe.steps = recipe.steps || [];
    if (imageUrl) recipe.image_url = imageUrl;
    return json({ recipe });
  } catch {
    return json({ error: 'Invalid recipe JSON' }, { status: 422 });
  }
}
