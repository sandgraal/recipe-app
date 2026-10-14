import Anthropic from '@anthropic-ai/sdk';
import { AI_EFFORT, AI_MAX_TOKENS, aiModel, parseJsonObject, readOutcome, runMessage } from '@/lib/ai';
import { TRANSLATION_SCHEMA } from '@/lib/aiSchemas';
import { logger } from '@/lib/logger';

// Shared recipe → Spanish translation logic, used by both the on-demand
// /api/translate route and the auto-translate-on-create path in POST /api/recipes.

type Ingredient = { amount?: string; unit?: string; item: string; notes?: string };
type Step = { order: number; text: string; timer_seconds?: number };

export interface SpanishFields {
  title_es: string;
  description_es: string | null;
  notes_es: string | null;
  tags_es: string[] | null;
  steps_es: Step[];
  ingredients_es: { item: string; notes?: string }[];
  translated_at: string;
}

type TranslatedJson = {
  title?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  ingredients?: { item?: string; notes?: string }[];
  steps?: string[];
};

interface TranslatableRecipe {
  title: string;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  ingredients?: Ingredient[] | null;
  steps?: Step[] | null;
}

/**
 * Translate a recipe's user-facing fields into Spanish and return the `*_es`
 * columns ready to persist. Returns null if there is no API key configured or
 * the model response can't be parsed — callers should treat null as "skip,
 * leave untranslated" rather than an error.
 */
export async function buildSpanishFields(
  recipe: TranslatableRecipe
): Promise<SpanishFields | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!recipe.title?.trim()) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const payload = {
    title: recipe.title,
    description: recipe.description || '',
    notes: recipe.notes || '',
    tags: recipe.tags || [],
    ingredients: (recipe.ingredients || []).map((ing) => ({
      item: ing.item,
      notes: ing.notes || '',
    })),
    steps: (recipe.steps || []).map((s) => s.text),
  };

  const prompt = `Translate the following recipe fields from English to Spanish. Keep the same structure: same number of ingredients and steps, in the same order.

Rules:
- Translate naturally, not word-for-word. Use culinary Spanish appropriate for Latin America.
- Keep ingredient measurements in English (e.g. "1 cup", "2 tbsp") — only translate the ingredient name and notes. The app localizes the units separately.
- Keep cooking technique terms recognizable (e.g. sauté → saltear, simmer → hervir a fuego lento).
- If a field is empty string or empty array, return it as-is.

Input JSON:
${JSON.stringify(payload, null, 2)}`;

  const message = await runMessage(client, {
    model: aiModel(),
    max_tokens: AI_MAX_TOKENS.translate,
    output_config: { effort: AI_EFFORT.translate, format: { type: 'json_schema', schema: TRANSLATION_SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  });

  // A refused or cut-off translation is "skip, leave untranslated" (null), never a half-translation.
  const outcome = readOutcome(message);
  if (outcome.kind !== 'ok') {
    logger.warn(`translate: ${outcome.kind}`, outcome.kind === 'refusal' ? { category: outcome.category } : { outputTokens: message.usage.output_tokens });
    return null;
  }
  const translated = parseJsonObject(outcome.text) as TranslatedJson | null;
  // Malformed model output — honor the null contract instead of throwing.
  if (!translated) return null;

  const stepsEs: Step[] = (recipe.steps || []).map((s, idx) => ({
    ...s,
    text: translated.steps?.[idx] ?? s.text,
  }));

  const ingredientsEs = (recipe.ingredients || []).map((ing, idx) => ({
    item: translated.ingredients?.[idx]?.item ?? ing.item,
    notes: translated.ingredients?.[idx]?.notes || ing.notes || undefined,
  }));

  return {
    title_es: translated.title || recipe.title,
    description_es: translated.description || null,
    notes_es: translated.notes || null,
    tags_es: translated.tags && translated.tags.length > 0 ? translated.tags : null,
    steps_es: stepsEs,
    ingredients_es: ingredientsEs,
    translated_at: new Date().toISOString(),
  };
}
