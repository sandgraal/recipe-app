import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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

export async function POST(req: NextRequest) {
  try {
    const { recipeId } = await req.json();
    if (!recipeId) return json({ error: 'recipeId required' }, { status: 400 });

    const supabase = getSupabase();

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

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build a compact JSON payload for translation
    const payload = {
      title: recipeRow.title,
      description: recipeRow.description || '',
      notes: recipeRow.notes || '',
      tags: recipeRow.tags || [],
      ingredients: (recipeRow.ingredients || []).map((ing: { item: string; notes?: string }) => ({
        item: ing.item,
        notes: ing.notes || '',
      })),
      steps: (recipeRow.steps || []).map((s: { text: string }) => s.text),
    };

    const prompt = `Translate the following recipe fields from English to Spanish. Return ONLY a valid JSON object with the same structure — no markdown, no explanation.

Rules:
- Translate naturally, not word-for-word. Use culinary Spanish appropriate for Latin America.
- Keep ingredient measurements in English (e.g. "1 cup", "2 tbsp") — only translate the ingredient name and notes.
- Keep cooking technique terms recognizable (e.g. sauté → saltear, simmer → hervir a fuego lento).
- If a field is empty string or empty array, return it as-is.

Input JSON:
${JSON.stringify(payload, null, 2)}

Return format:
{
  "title": "...",
  "description": "...",
  "notes": "...",
  "tags": [...],
  "ingredients": [{"item": "...", "notes": "..."}],
  "steps": [...]
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON — strip any markdown fences if present
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return json({ error: 'Translation response was not valid JSON' }, { status: 500 });
    }

    const translated = JSON.parse(jsonMatch[0]);

    // Merge translated steps back into step objects with order preserved
    const stepsEs = (recipeRow.steps || []).map((s: { order: number; text: string; timer_seconds?: number }, idx: number) => ({
      ...s,
      text: translated.steps?.[idx] ?? s.text,
    }));

    // Merge translated ingredient items back into ingredient objects
    const ingredientsEs = (recipeRow.ingredients || []).map((ing: { amount?: string; unit?: string; item: string; notes?: string }, idx: number) => ({
      item: translated.ingredients?.[idx]?.item ?? ing.item,
      notes: translated.ingredients?.[idx]?.notes || ing.notes || undefined,
    }));

    // Write to Supabase
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        title_es: translated.title || recipeRow.title,
        description_es: translated.description || null,
        notes_es: translated.notes || null,
        tags_es: translated.tags?.length > 0 ? translated.tags : null,
        steps_es: stepsEs,
        ingredients_es: ingredientsEs,
        translated_at: new Date().toISOString(),
      })
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
