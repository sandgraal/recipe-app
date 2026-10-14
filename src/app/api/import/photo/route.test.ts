import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { RECIPE, haikuRequestProblems, jsonMessage, message, refusalMessage, thinking, truncatedMessage } from '@/lib/testing/aiMessages';

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://img.example/recipe.jpg' } }),
      }),
    },
  }),
}));

import { POST } from './route';

function req(file: File | null) {
  const fd = new FormData();
  if (file) fd.append('image', file);
  return new NextRequest('http://localhost/api/import/photo', { method: 'POST', body: fd });
}
const photo = () => new File([new Uint8Array([1, 2, 3, 4])], 'card.jpg', { type: 'image/jpeg' });

let stream: ReturnType<typeof vi.spyOn>;
const answer = (m: Anthropic.Message) => stream.mockImplementation((() => ({ finalMessage: async () => m })) as never);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  delete process.env.ADMIN_PASSWORD;
  stream = vi.spyOn(Anthropic.Messages.prototype, 'stream');
  answer(jsonMessage(RECIPE));
});
afterEach(() => { stream.mockRestore(); });

describe('POST /api/import/photo', () => {
  it('sends the image as base64 to Haiku 5.5 with structured output at medium effort', async () => {
    await POST(req(photo()));
    const [params] = stream.mock.calls[0] as unknown as [Record<string, unknown> & { messages: { content: { type: string; source?: { type: string; media_type: string; data: string } }[] }[] }];
    expect(haikuRequestProblems(params)).toEqual([]);
    expect(params.max_tokens).toBe(8000);
    expect((params.output_config as { effort: string }).effort).toBe('medium');
    const [image, prompt] = params.messages[0].content;
    expect(image.type).toBe('image');
    expect(image.source).toMatchObject({ type: 'base64', media_type: 'image/jpeg', data: Buffer.from([1, 2, 3, 4]).toString('base64') });
    expect(prompt.type).toBe('text');
  });

  it('returns the recipe with the uploaded image url, past a thinking block', async () => {
    const res = await POST(req(photo()));
    expect(res.status).toBe(200);
    const { recipe } = await res.json();
    expect(recipe).toMatchObject({ title: 'Gallo pinto', source_type: 'photo', image_url: 'https://img.example/recipe.jpg' });
  });

  it('refusal is a 422 in both languages', async () => {
    answer(refusalMessage('general_harms' as never));
    const res = await POST(req(photo()));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error).toMatch(/asistente/);
    expect(error).toMatch(/assistant/);
  });

  it('max_tokens is a 422 about a cut-off result', async () => {
    answer(truncatedMessage());
    const res = await POST(req(photo()));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/cortó/);
  });

  it('empty answer keeps the old image-specific message', async () => {
    answer(message({ content: [thinking()] }));
    const res = await POST(req(photo()));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('Could not parse recipe from image');
  });

  it('requires an image', async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });
});
