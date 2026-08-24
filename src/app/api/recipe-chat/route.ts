import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';

type ChatRecipe = {
  title?: string; cuisine?: string; servings?: number; total_time?: string;
  ingredients?: { amount: string; unit: string; item: string }[];
  steps?: { order: number; text: string }[];
  notes?: string;
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'recipe-chat', { limit: 30, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(limited.retryAfter) } });
  }

  let body: { question?: unknown; recipe?: ChatRecipe };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }
  const question = body.question;
  const recipe = body.recipe;
  if (!question || typeof question !== 'string' || !recipe) {
    return NextResponse.json({ error: 'Missing question or recipe' }, { status: 400, headers: CORS_HEADERS });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: 'Question too long' }, { status: 400, headers: CORS_HEADERS });
  }

  const client = new Anthropic();

  const recipeContext = `
Recipe: ${recipe.title}
Cuisine: ${recipe.cuisine || 'unknown'}
Servings: ${recipe.servings || 'unknown'}
Time: ${recipe.total_time || 'unknown'}
Ingredients: ${recipe.ingredients?.map((i: { amount: string; unit: string; item: string }) => `${i.amount} ${i.unit} ${i.item}`).join(', ') || 'none listed'}
Steps: ${recipe.steps?.map((s: { order: number; text: string }) => `${s.order}. ${s.text}`).join(' | ') || 'none listed'}
Notes: ${recipe.notes || 'none'}
`.trim();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a helpful cooking assistant. Answer the question about this recipe concisely (2-3 sentences max). Be practical and specific.

${recipeContext}

Question: ${question}`,
    }],
  });

  const answer = (message.content[0] as { type: string; text: string }).text.trim();
  return NextResponse.json({ answer }, { headers: CORS_HEADERS });
}
