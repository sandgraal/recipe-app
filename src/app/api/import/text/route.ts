import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/requestBody';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await checkRateLimit(req, 'import-text', { limit: 15, windowMs: 60_000 });
  if (limited) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });
  const client = new Anthropic();
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, { status: parsed.status });
  const text = (parsed.data as { text?: unknown }).text;
  if (!text || typeof text !== 'string') return json({ error: 'Text required' }, { status: 400 });

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Parse this recipe text into structured JSON. Return ONLY a JSON object with these exact fields (no markdown, no explanation):
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
}

Recipe text:
${text.slice(0, 8000)}`,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return json({ error: 'Could not parse recipe' }, { status: 422 });

  try {
    const recipe = JSON.parse(jsonMatch[0]);
    recipe.source_type = 'text';
    recipe.tags = recipe.tags || [];
    recipe.ingredients = recipe.ingredients || [];
    recipe.steps = recipe.steps || [];
    return json({ recipe });
  } catch {
    return json({ error: 'Invalid recipe JSON' }, { status: 422 });
  }
}
