import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { haikuRequestProblems, jsonMessage, message, refusalMessage, text, thinking, truncatedMessage } from './testing/aiMessages';

const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: log }));

import { buildSpanishFields } from './translate';

const RECIPE = {
  title: 'Gallo pinto',
  description: 'Rice and beans',
  notes: null,
  tags: ['breakfast'],
  ingredients: [{ item: 'rice', amount: '2', unit: 'cups' }, { item: 'black beans', notes: 'cooked' }],
  steps: [{ order: 1, text: 'Cook the rice.', timer_seconds: 600 }, { order: 2, text: 'Add the beans.' }],
};
const TRANSLATED = {
  title: 'Gallo pinto',
  description: 'Arroz y frijoles',
  notes: '',
  tags: ['desayuno'],
  ingredients: [{ item: 'arroz', notes: '' }, { item: 'frijoles negros', notes: 'cocidos' }],
  steps: ['Cocina el arroz.', 'Agrega los frijoles.'],
};

let stream: ReturnType<typeof vi.spyOn>;
const answer = (m: Anthropic.Message) => stream.mockImplementation((() => ({ finalMessage: async () => m })) as never);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  log.warn.mockReset();
  stream = vi.spyOn(Anthropic.Messages.prototype, 'stream');
  answer(jsonMessage(TRANSLATED));
});
afterEach(() => { stream.mockRestore(); });

describe('buildSpanishFields', () => {
  it('asks Haiku 5.5 at low effort, streaming, with 16000 output tokens and structured output', async () => {
    await buildSpanishFields(RECIPE);
    const [params] = stream.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(haikuRequestProblems(params)).toEqual([]);
    expect(params.max_tokens).toBe(16000);
    const cfg = params.output_config as { effort: string; format: { type: string; schema: { required: string[] } } };
    expect(cfg.effort).toBe('low');
    expect(cfg.format.type).toBe('json_schema');
    expect(cfg.format.schema.required).toContain('steps');
    expect(JSON.stringify(params.messages)).toContain('Cook the rice.');
  });

  it('builds the *_es fields from the text block that follows a thinking block', async () => {
    const out = await buildSpanishFields(RECIPE);
    expect(out).toMatchObject({
      title_es: 'Gallo pinto',
      description_es: 'Arroz y frijoles',
      notes_es: null,
      tags_es: ['desayuno'],
    });
    expect(out!.steps_es).toEqual([
      { order: 1, text: 'Cocina el arroz.', timer_seconds: 600 },
      { order: 2, text: 'Agrega los frijoles.' },
    ]);
    expect(out!.ingredients_es).toEqual([
      { item: 'arroz', notes: undefined },
      { item: 'frijoles negros', notes: 'cocidos' },
    ]);
    expect(typeof out!.translated_at).toBe('string');
  });

  it('returns null (skip, leave untranslated) on a refusal', async () => {
    answer(refusalMessage('cyber'));
    expect(await buildSpanishFields(RECIPE)).toBeNull();
    expect(log.warn).toHaveBeenCalledWith('translate: refusal', { category: 'cyber' });
  });

  it('returns null when the answer is cut off, never a half translation', async () => {
    answer(truncatedMessage('{"title": "Gallo pinto", "description": "Arroz', ));
    expect(await buildSpanishFields(RECIPE)).toBeNull();
    expect(log.warn).toHaveBeenCalled();
  });

  it('returns null for an empty or unparseable answer', async () => {
    answer(message({ content: [thinking()] }));
    expect(await buildSpanishFields(RECIPE)).toBeNull();
    answer(message({ content: [text('Lo siento, no puedo.')] }));
    expect(await buildSpanishFields(RECIPE)).toBeNull();
  });

  it('does nothing without a key or a title', async () => {
    expect(await buildSpanishFields({ ...RECIPE, title: ' ' })).toBeNull();
    delete process.env.ANTHROPIC_API_KEY;
    expect(await buildSpanishFields(RECIPE)).toBeNull();
    expect(stream).not.toHaveBeenCalled();
  });
});
