import type Anthropic from '@anthropic-ai/sdk';

/**
 * One place for how the app talks to Claude. Every AI route uses Claude Haiku
 * 5.5 (owner decision), reads the reply through `readOutcome`, and turns a
 * refusal or a cut-off answer into a plain message instead of a 500.
 *
 * Haiku 5.5 rules these helpers rely on:
 *  - no `thinking` param (adaptive thinking is on by default; its tokens count
 *    as output, so `max_tokens` is generous) and no `budget_tokens`;
 *  - no `temperature` / `top_p` / `top_k`;
 *  - no assistant prefill: JSON comes from `output_config.format`;
 *  - the reply may hold `thinking` blocks, so text is picked by block type;
 *  - `stop_reason: "refusal"` can happen and has no server-side fallback.
 */

/** Exact id, no date suffix. */
export const DEFAULT_AI_MODEL = 'claude-haiku-5-5';

/** The model every AI call uses. `AI_MODEL` overrides it (e.g. to try another model). */
export function aiModel(): string {
  return process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
}

/**
 * Output ceilings. The Haiku 5.5 tokenizer counts about 30% more tokens than
 * the old one and thinking tokens count as output, so these are not tight.
 */
export const AI_MAX_TOKENS = {
  /** Recipe import, ingredient identification, recipe ideas. */
  extract: 8000,
  /** Whole-recipe translation. */
  translate: 16000,
  /** Short answers about one recipe. */
  chat: 1500,
} as const;

/** Reasoning effort per kind of work (Haiku 5.5 default would be `medium`). */
export const AI_EFFORT = {
  extract: 'medium', // photos and messy web pages benefit from a little thinking
  translate: 'low',
  chat: 'low',
} as const;

/**
 * Run a request and wait for the whole message. Streaming underneath avoids
 * HTTP timeouts for large `max_tokens`; callers see a normal Message.
 */
export function runMessage(client: Anthropic, params: Anthropic.MessageStreamParams): Promise<Anthropic.Message> {
  return client.messages.stream(params).finalMessage();
}

/** Only the `text` blocks, joined. Never `content[0]`: it may be a `thinking` block. */
export function textOf(message: Pick<Anthropic.Message, 'content'>): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
}

export type AiOutcome =
  | { kind: 'ok'; text: string }
  | { kind: 'refusal'; category: string | null }
  | { kind: 'max_tokens'; text: string }
  | { kind: 'empty' };

/** What a finished message amounts to; check the kind before using any text. */
export function readOutcome(message: Anthropic.Message): AiOutcome {
  if (message.stop_reason === 'refusal') {
    return { kind: 'refusal', category: message.stop_details?.category ?? null };
  }
  const text = textOf(message);
  if (message.stop_reason === 'max_tokens') return { kind: 'max_tokens', text };
  if (!text) return { kind: 'empty' };
  return { kind: 'ok', text };
}

/**
 * Parse the model's JSON reply. With structured outputs the whole text is the
 * JSON; the fenced / surrounded-by-prose fallback only matters if the format
 * is ever not applied (for example a model override that ignores it).
 */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const attempt = (s: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const direct = attempt(text.trim());
  if (direct) return direct;
  const m = text.match(/\{[\s\S]*\}/);
  return m ? attempt(m[0]) : null;
}

// ── User-facing messages (Spanish is the app's default language) ─────────────

export type AiProblem = 'refusal' | 'max_tokens' | 'empty';

export const AI_PROBLEM_TEXT: Record<AiProblem, { es: string; en: string }> = {
  refusal: {
    es: 'El asistente no pudo procesar este contenido. Prueba con otro texto o foto, o escribe la receta a mano.',
    en: 'The assistant could not process this content. Try different text or another photo, or enter the recipe by hand.',
  },
  max_tokens: {
    es: 'El resultado era demasiado largo y se cortó. Prueba con un texto más corto o por partes.',
    en: 'The result was too long and got cut off. Try shorter text or one part at a time.',
  },
  empty: {
    es: 'El asistente no devolvió una respuesta. Inténtalo de nuevo.',
    en: 'The assistant did not return an answer. Please try again.',
  },
};

/**
 * Text for one problem. With a known language it is that language; routes that
 * do not know the UI language (the import and identify forms) get both,
 * Spanish first, so the person can read it whichever they use.
 */
export function problemText(problem: AiProblem, lang?: string | null): string {
  const t = AI_PROBLEM_TEXT[problem];
  if (lang === 'es') return t.es;
  if (lang === 'en') return t.en;
  return `${t.es} / ${t.en}`;
}
