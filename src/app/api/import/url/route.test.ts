import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { RECIPE, haikuRequestProblems, jsonMessage, message, refusalMessage, thinking, truncatedMessage } from '@/lib/testing/aiMessages';

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { POST } from './route';

const PAGE = `<html><head><meta property="og:image" content="https://cdn.example/hero.jpg"></head>
<body><script>var x=1</script><h1>Gallo pinto</h1><p>Rice and beans, the Costa Rican way.</p></body></html>`;

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/import/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

let stream: ReturnType<typeof vi.spyOn>;
const answer = (m: Anthropic.Message) => stream.mockImplementation((() => ({ finalMessage: async () => m })) as never);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  delete process.env.ADMIN_PASSWORD;
  vi.stubGlobal('fetch', vi.fn(async () => new Response(PAGE, { status: 200 })));
  stream = vi.spyOn(Anthropic.Messages.prototype, 'stream');
  answer(jsonMessage(RECIPE));
});
afterEach(() => { stream.mockRestore(); vi.unstubAllGlobals(); });

describe('POST /api/import/url', () => {
  it('sends the stripped page text to Haiku 5.5 with structured output', async () => {
    await POST(req({ url: 'https://recipes.example.com/gallo-pinto' }));
    const [params] = stream.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(haikuRequestProblems(params)).toEqual([]);
    expect(params.max_tokens).toBe(8000);
    expect((params.output_config as { effort: string }).effort).toBe('medium');
    const prompt = JSON.stringify(params.messages);
    expect(prompt).toContain('Rice and beans');
    expect(prompt).not.toContain('var x=1'); // scripts are stripped
  });

  it('returns the recipe with source url and og:image, past a thinking block', async () => {
    const res = await POST(req({ url: 'https://recipes.example.com/gallo-pinto' }));
    expect(res.status).toBe(200);
    const { recipe } = await res.json();
    expect(recipe).toMatchObject({
      title: 'Gallo pinto', source_type: 'url',
      source_url: 'https://recipes.example.com/gallo-pinto', image_url: 'https://cdn.example/hero.jpg',
    });
  });

  it('refusal is a 422 in both languages', async () => {
    answer(refusalMessage());
    const res = await POST(req({ url: 'https://recipes.example.com/x' }));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error).toMatch(/asistente/);
    expect(error).toMatch(/assistant/);
  });

  it('max_tokens is a 422 about a cut-off result', async () => {
    answer(truncatedMessage());
    const res = await POST(req({ url: 'https://recipes.example.com/x' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/cortó/);
  });

  it('an empty answer keeps "Could not parse recipe"', async () => {
    answer(message({ content: [thinking()] }));
    const res = await POST(req({ url: 'https://recipes.example.com/x' }));
    expect((await res.json()).error).toBe('Could not parse recipe');
  });

  it('refuses private URLs before any model call', async () => {
    const res = await POST(req({ url: 'http://127.0.0.1/admin' }));
    expect(res.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });
});
