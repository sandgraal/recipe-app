import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { AI_EFFORT, AI_MAX_TOKENS, aiModel, problemText, readOutcome } from '@/lib/ai';

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

  let body: { question?: unknown; recipe?: ChatRecipe; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }
  const question = body.question;
  const recipe = body.recipe;
  const lang = typeof body.lang === 'string' ? body.lang : null;
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
    model: aiModel(),
    max_tokens: AI_MAX_TOKENS.chat,
    output_config: { effort: AI_EFFORT.chat },
    messages: [{
      role: 'user',
      content: `You are a helpful cooking assistant. Answer the question about this recipe concisely (2-3 sentences max). Be practical and specific.

${recipeContext}

Question: ${question}`,
    }],
  });

  // The UI shows `answer` whatever the status, so a problem is also an answer
  // in the person's language (the form sends `lang`).
  const outcome = readOutcome(message);
  if (outcome.kind === 'refusal' || outcome.kind === 'empty') {
    logger.warn(`recipe-chat: ${outcome.kind}`, outcome.kind === 'refusal' ? { category: outcome.category } : undefined);
    const text = problemText(outcome.kind, lang);
    return NextResponse.json({ error: text, answer: text }, { status: outcome.kind === 'refusal' ? 422 : 502, headers: CORS_HEADERS });
  }
  if (outcome.kind === 'max_tokens') {
    // Keep what was written; only say so when nothing usable came back.
    logger.warn('recipe-chat: max_tokens', { outputTokens: message.usage.output_tokens });
    if (!outcome.text) {
      const text = problemText('max_tokens', lang);
      return NextResponse.json({ error: text, answer: text }, { status: 502, headers: CORS_HEADERS });
    }
    return NextResponse.json({ answer: outcome.text, truncated: true }, { headers: CORS_HEADERS });
  }
  return NextResponse.json({ answer: outcome.text }, { headers: CORS_HEADERS });
}
