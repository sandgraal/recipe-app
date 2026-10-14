import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { haikuRequestProblems, jsonMessage, message, refusalMessage, thinking, truncatedMessage } from '@/lib/testing/aiMessages';

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: log }));

const COLLECTION = [
  { id: 'r1', title: 'Arroz con pollo', ingredients: [{ item: 'rice' }, { item: 'chicken' }] },
  { id: 'r2', title: 'Ensalada', ingredients: [{ item: 'lettuce' }] },
];
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: COLLECTION }) }) }) }),
  }),
}));

import { POST } from './route';

const IDENTIFIED = { ingredients: ['rice', 'chicken'], search_terms: ['chicken rice'] };
const SUGGESTED = {
  matching_recipe_ids: ['r1'],
  suggestions: [{ title: 'Arroz frito', description: 'Quick', key_steps: ['Fry', 'Serve'] }],
};

function photoReq() {
  const fd = new FormData();
  fd.append('image', new File([new Uint8Array([9, 9])], 'fridge.png', { type: 'image/png' }));
  return new NextRequest('http://localhost/api/identify', { method: 'POST', body: fd });
}
function pantryReq(items: string[]) {
  const fd = new FormData();
  fd.append('image', new File([new Uint8Array([9])], 'pantry.png', { type: 'image/png' }));
  fd.append('pantry', JSON.stringify(items));
  return new NextRequest('http://localhost/api/identify', { method: 'POST', body: fd });
}

let stream: ReturnType<typeof vi.spyOn>;
/** Replies in order, one per model call. */
const replies = (...ms: Anthropic.Message[]) => {
  const queue = [...ms];
  stream.mockImplementation((() => ({ finalMessage: async () => queue.shift()! })) as never);
};

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  log.warn.mockReset();
  stream = vi.spyOn(Anthropic.Messages.prototype, 'stream');
  replies(jsonMessage(IDENTIFIED), jsonMessage(SUGGESTED));
});
afterEach(() => { stream.mockRestore(); });

describe('POST /api/identify (photo)', () => {
  it('makes two Haiku 5.5 calls with structured output at medium effort', async () => {
    const res = await POST(photoReq());
    expect(res.status).toBe(200);
    expect(stream).toHaveBeenCalledTimes(2);
    const calls = stream.mock.calls as unknown as [Record<string, unknown>][];
    for (const [params] of calls) {
      expect(haikuRequestProblems(params)).toEqual([]);
      expect(params.max_tokens).toBe(8000);
      const cfg = params.output_config as { effort: string; format: { type: string } };
      expect(cfg.effort).toBe('medium');
      expect(cfg.format.type).toBe('json_schema');
    }
    const first = (calls[0][0].messages as { content: { type: string }[] }[])[0].content;
    expect(first[0].type).toBe('image');
  });

  it('keeps the response contract, past thinking blocks', async () => {
    const data = await (await POST(photoReq())).json();
    expect(data.identified).toEqual(['rice', 'chicken']);
    expect(data.searchTerms).toEqual(['chicken rice']);
    expect(data.from_collection.map((r: { id: string }) => r.id)).toEqual(['r1']);
    expect(data.suggestions).toHaveLength(1);
  });

  it('a refused photo is a 422 in both languages', async () => {
    replies(refusalMessage('bio'));
    const res = await POST(photoReq());
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error).toMatch(/asistente/);
    expect(error).toMatch(/assistant/);
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it('a cut-off photo answer is a 422, not a parse of half a JSON', async () => {
    replies(truncatedMessage('{"ingredients": ["ri'));
    const res = await POST(photoReq());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/cortó/);
  });

  it('no text keeps "Could not identify ingredients"', async () => {
    replies(message({ content: [thinking()] }));
    const res = await POST(photoReq());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('Could not identify ingredients');
  });

  it('a refused suggestions step still returns the ingredients', async () => {
    replies(jsonMessage(IDENTIFIED), refusalMessage());
    const res = await POST(photoReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.identified).toEqual(['rice', 'chicken']);
    expect(data.suggestions).toEqual([]);
    expect(data.from_collection).toEqual([]);
    expect(log.warn).toHaveBeenCalled();
  });

  it('a cut-off suggestions step also degrades to empty', async () => {
    replies(jsonMessage(IDENTIFIED), truncatedMessage('{"matching_recipe_ids": ["r1"], "sugg'));
    const data = await (await POST(photoReq())).json();
    expect(data.suggestions).toEqual([]);
    expect(data.from_collection).toEqual([]);
  });
});

describe('POST /api/identify (pantry mode)', () => {
  it('skips vision and makes only the suggestions call', async () => {
    replies(jsonMessage(SUGGESTED));
    const data = await (await POST(pantryReq(['rice', 'chicken']))).json();
    expect(stream).toHaveBeenCalledTimes(1);
    expect(data.identified).toEqual(['rice', 'chicken']);
    expect(data.suggestions[0].title).toBe('Arroz frito');
    expect(JSON.stringify((stream.mock.calls[0] as unknown as [{ messages: unknown }])[0].messages)).toContain('rice, chicken');
  });
});
