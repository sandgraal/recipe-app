import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { RECIPE, haikuRequestProblems, jsonMessage, message, refusalMessage, text, thinking, truncatedMessage } from '@/lib/testing/aiMessages';

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { POST } from './route';

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/import/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

let stream: ReturnType<typeof vi.spyOn>;
const answer = (m: Anthropic.Message) => stream.mockImplementation((() => ({ finalMessage: async () => m })) as never);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  delete process.env.ADMIN_PASSWORD;
  delete process.env.AI_MODEL;
  stream = vi.spyOn(Anthropic.Messages.prototype, 'stream');
  answer(jsonMessage(RECIPE));
});
afterEach(() => { stream.mockRestore(); });

describe('POST /api/import/text', () => {
  it('asks Haiku 5.5 for structured JSON at medium effort with 8000 tokens', async () => {
    await POST(req({ text: 'Gallo pinto: arroz y frijoles' }));
    const [params] = stream.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(haikuRequestProblems(params)).toEqual([]);
    expect(params.max_tokens).toBe(8000);
    const cfg = params.output_config as { effort: string; format: { type: string; schema: { required: string[] } } };
    expect(cfg.effort).toBe('medium');
    expect(cfg.format.type).toBe('json_schema');
    expect(cfg.format.schema.required).toContain('ingredients');
    expect(JSON.stringify(params.messages)).toContain('Gallo pinto');
  });

  it('returns the recipe when a thinking block comes first', async () => {
    const res = await POST(req({ text: 'x' }));
    expect(res.status).toBe(200);
    const { recipe } = await res.json();
    expect(recipe.title).toBe('Gallo pinto');
    expect(recipe.source_type).toBe('text');
    expect(recipe.steps).toHaveLength(1);
  });

  it('still fills the defaults for missing lists', async () => {
    answer(message({ content: [thinking(), text('{"title":"Solo titulo"}')] }));
    const { recipe } = await (await POST(req({ text: 'x' }))).json();
    expect(recipe).toMatchObject({ title: 'Solo titulo', tags: [], ingredients: [], steps: [], source_type: 'text' });
  });

  it('refusal is a 422 with a message in both languages, not a 500', async () => {
    answer(refusalMessage('cyber'));
    const res = await POST(req({ text: 'x' }));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error).toMatch(/asistente/);
    expect(error).toMatch(/assistant/);
  });

  it('max_tokens is a 422 and the partial JSON is never parsed', async () => {
    answer(truncatedMessage('{"title": "Sopa", "ingredients": []}'));
    const res = await POST(req({ text: 'x' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/cortó/);
  });

  it('no text at all keeps the old "Could not parse recipe"', async () => {
    answer(message({ content: [thinking()] }));
    const res = await POST(req({ text: 'x' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('Could not parse recipe');
  });

  it('text that is not JSON keeps "Invalid recipe JSON"', async () => {
    answer(message({ content: [text('Sorry, no recipe here.')] }));
    const res = await POST(req({ text: 'x' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('Invalid recipe JSON');
  });

  it('AI_MODEL overrides the model', async () => {
    process.env.AI_MODEL = 'claude-sonnet-5-5';
    await POST(req({ text: 'x' }));
    expect((stream.mock.calls[0] as unknown as [{ model: string }])[0].model).toBe('claude-sonnet-5-5');
  });

  it('rejects a missing text before calling the model', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });
});
