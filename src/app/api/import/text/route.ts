import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/requestBody';
import { extractRecipe } from '@/lib/importRecipe';

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

  const result = await extractRecipe(client, 'import/text', `Parse this recipe text into structured data. Use null for anything the text does not say. "order" counts the steps from 1.

Recipe text:
${text.slice(0, 8000)}`, 'Could not parse recipe');
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  const recipe = result.recipe;
  recipe.source_type = 'text';
  return json({ recipe });
}
