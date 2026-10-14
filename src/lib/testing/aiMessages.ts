import type Anthropic from '@anthropic-ai/sdk';

/** Builders for fake Haiku 5.5 messages in tests. No test framework imports here. */

export const text = (t: string) => ({ type: 'text', text: t, citations: null }) as Anthropic.ContentBlock;

/** Haiku 5.5 may put an (empty by default) thinking block before the answer. */
export const thinking = (t = '') => ({ type: 'thinking', thinking: t, signature: 'sig' }) as Anthropic.ContentBlock;

export function message(over: Partial<Anthropic.Message> = {}): Anthropic.Message {
  return {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-haiku-5-5',
    content: [thinking(), text('ok')],
    stop_reason: 'end_turn', stop_sequence: null, stop_details: null,
    usage: { input_tokens: 100, output_tokens: 50 },
    ...over,
  } as Anthropic.Message;
}

/** A finished message whose answer is `value` as JSON, behind a thinking block. */
export const jsonMessage = (value: unknown, over: Partial<Anthropic.Message> = {}) =>
  message({ content: [thinking(), text(JSON.stringify(value))], ...over });

export const refusalMessage = (category: 'cyber' | 'bio' | null = null) =>
  message({
    content: [thinking()],
    stop_reason: 'refusal',
    stop_details: { type: 'refusal', category, explanation: null },
  } as Partial<Anthropic.Message>);

/** Cut off by max_tokens; `partial` is whatever text got out first. */
export const truncatedMessage = (partial = '{"title": "Sopa') =>
  message({ content: [thinking(), ...(partial ? [text(partial)] : [])], stop_reason: 'max_tokens' });

export const RECIPE = {
  title: 'Gallo pinto',
  description: null,
  servings: 4,
  total_time: '30 min',
  cuisine: 'Costa Rican',
  tags: ['breakfast'],
  ingredients: [{ amount: '2', unit: 'cups', item: 'rice', notes: null }],
  steps: [{ order: 1, text: 'Cook the rice.' }],
  notes: null,
};

/** What every Haiku 5.5 request in this app must satisfy (no 400s: no thinking budget, sampling params, forced tools or prefill). */
export function haikuRequestProblems(params: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (params.model !== 'claude-haiku-5-5') problems.push(`model is ${String(params.model)}`);
  for (const k of ['thinking', 'temperature', 'top_p', 'top_k']) if (k in params) problems.push(`${k} must be omitted`);
  const choice = params.tool_choice as { type?: string } | undefined;
  if (choice && choice.type !== 'auto' && choice.type !== 'none') problems.push('forced tool_choice');
  const msgs = params.messages as { role: string }[];
  if (!msgs?.length || msgs[msgs.length - 1].role !== 'user') problems.push('last message must be from the user (no prefill)');
  return problems;
}
