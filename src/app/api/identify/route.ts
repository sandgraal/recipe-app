import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
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
  const limited = checkRateLimit(req, 'identify', { limit: 15, windowMs: 60_000 });
  if (limited) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });
  const client = new Anthropic();
  const supabase = getSupabase();

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return json({ error: 'Image required' }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return json({ error: 'Image too large (max 10 MB)' }, { status: 413 });

  // If the caller passed an explicit pantry list, use it and skip vision
  const pantryRaw = formData.get('pantry') as string | null;
  let identified: string[] = [];
  let searchTerms: string[] = [];

  if (pantryRaw) {
    // Pantry-mode: ingredient list provided directly, no image analysis needed
    try {
      identified = JSON.parse(pantryRaw) as string[];
    } catch {
      return json({ error: 'Invalid pantry JSON' }, { status: 400 });
    }
    searchTerms = [];
  } else {
    // Vision-mode: identify ingredients from the uploaded photo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const identifyMsg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Identify all ingredients visible in this photo. Return ONLY a JSON object (no markdown):
{
  "ingredients": string[],
  "search_terms": string[]
}
"search_terms" should be 2-3 word phrases useful for finding recipes that use these ingredients (e.g. "chicken pasta", "tomato basil").`,
          },
        ],
      }],
    });

    const identifyRaw = (identifyMsg.content[0] as { type: string; text: string }).text.trim();
    const identifyMatch = identifyRaw.match(/\{[\s\S]*\}/);
    if (!identifyMatch) return json({ error: 'Could not identify ingredients' }, { status: 422 });

    try {
      const parsed = JSON.parse(identifyMatch[0]);
      identified = parsed.ingredients || [];
      searchTerms = parsed.search_terms || [];
    } catch {
      return json({ error: 'Parse error' }, { status: 422 });
    }
  }

  if (identified.length === 0) {
    return json({ identified: [], searchTerms: [], from_collection: [], suggestions: [] });
  }

  // Step 2: Search user's collection
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select('id, title, description, cuisine, total_time, servings, tags, image_url, ingredients, source_type, created_at, updated_at, steps, notes, source_url')
    .order('created_at', { ascending: false })
    .limit(200);

  const collection = allRecipes || [];
  const collectionSummary = collection.map(r => ({
    id: r.id,
    title: r.title,
    ingredients: (r.ingredients as Array<{ item: string }>)?.slice(0, 5).map((i) => i.item).join(', ') || '',
  }));

  // Step 3: Ask Claude to match and suggest
  const suggestMsg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `I have these ingredients: ${identified.join(', ')}.

My recipe collection:
${JSON.stringify(collectionSummary, null, 2)}

Return ONLY a JSON object (no markdown):
{
  "matching_recipe_ids": string[],
  "suggestions": [
    {
      "title": string,
      "description": string,
      "key_steps": string[]
    }
  ]
}

"matching_recipe_ids" should be IDs from my collection that can be made with the available ingredients.
"suggestions" should be 3 new recipe ideas that use the identified ingredients (not from my collection).`,
    }],
  });

  const suggestRaw = (suggestMsg.content[0] as { type: string; text: string }).text.trim();
  const suggestMatch = suggestRaw.match(/\{[\s\S]*\}/);
  let matchingIds: string[] = [];
  let suggestions: Array<{ title: string; description: string; key_steps: string[] }> = [];

  if (suggestMatch) {
    try {
      const parsed = JSON.parse(suggestMatch[0]);
      matchingIds = parsed.matching_recipe_ids || [];
      suggestions = parsed.suggestions || [];
    } catch { /* ignore */ }
  }

  const fromCollection = collection.filter(r => matchingIds.includes(r.id));

  return json({
    identified,
    searchTerms,
    from_collection: fromCollection,
    suggestions,
  });
}
