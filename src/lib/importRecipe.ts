import type Anthropic from '@anthropic-ai/sdk';
import { AI_EFFORT, AI_MAX_TOKENS, aiModel, parseJsonObject, problemText, readOutcome, runMessage } from '@/lib/ai';
import { RECIPE_SCHEMA } from '@/lib/aiSchemas';
import { logger } from '@/lib/logger';

export type ImportResult =
  | { ok: true; recipe: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/**
 * The model call shared by /api/import/text, /photo and /url: one user turn
 * (text, or an image plus text), a JSON reply shaped by RECIPE_SCHEMA, and the
 * recipe defaults the routes always applied. Refusals and cut-off answers come
 * back as a 422 with a message in both languages, never a 500.
 *
 * `unreadable` is the route's own 422 text when the model returned nothing
 * usable (kept so the UI's messages do not change).
 */
export async function extractRecipe(
  client: Anthropic,
  route: string,
  content: Anthropic.MessageParam['content'],
  unreadable: string,
): Promise<ImportResult> {
  const message = await runMessage(client, {
    model: aiModel(),
    max_tokens: AI_MAX_TOKENS.extract,
    output_config: { effort: AI_EFFORT.extract, format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
    messages: [{ role: 'user', content }],
  });

  const outcome = readOutcome(message);
  if (outcome.kind === 'refusal') {
    logger.warn('import: refusal', { route, category: outcome.category });
    return { ok: false, status: 422, error: problemText('refusal') };
  }
  if (outcome.kind === 'max_tokens') {
    logger.warn('import: max_tokens', { route, outputTokens: message.usage.output_tokens });
    return { ok: false, status: 422, error: problemText('max_tokens') };
  }
  if (outcome.kind === 'empty') return { ok: false, status: 422, error: unreadable };

  const recipe = parseJsonObject(outcome.text);
  if (!recipe) return { ok: false, status: 422, error: 'Invalid recipe JSON' };
  recipe.tags = recipe.tags || [];
  recipe.ingredients = recipe.ingredients || [];
  recipe.steps = recipe.steps || [];
  return { ok: true, recipe };
}
