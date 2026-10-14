import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { haikuRequestProblems, message, refusalMessage, text, thinking, truncatedMessage } from '@/lib/testing/aiMessages';

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { POST } from './route';

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/recipe-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const body = (lang?: string) => ({
  question: 'Can I use brown rice?',
  recipe: { title: 'Gallo pinto', ingredients: [{ amount: '2', unit: 'cups', item: 'rice' }] },
  ...(lang ? { lang } : {}),
});

let create: ReturnType<typeof vi.spyOn>;
const answer = (m: Anthropic.Message) => create.mockImplementation((() => Promise.resolve(m)) as never);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  create = vi.spyOn(Anthropic.Messages.prototype, 'create');
  answer(message({ content: [thinking(), text('  Yes, it works. ')] }));
});
afterEach(() => { create.mockRestore(); });

describe('POST /api/recipe-chat', () => {
  it('calls Haiku 5.5 at low effort with room for thinking tokens', async () => {
    await POST(req(body('en')));
    const [params] = create.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(haikuRequestProblems(params)).toEqual([]);
    expect(params.max_tokens).toBe(1500);
    expect(params.output_config).toEqual({ effort: 'low' });
    expect(JSON.stringify(params.messages)).toContain('brown rice');
  });

  it('answers with the text block even when a thinking block comes first', async () => {
    const res = await POST(req(body('en')));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 'Yes, it works.' });
  });

  it('refusal: answer is a message in the UI language (422, not 500)', async () => {
    answer(refusalMessage('bio'));
    const es = await POST(req(body('es')));
    expect(es.status).toBe(422);
    const esJson = await es.json();
    expect(esJson.answer).toMatch(/asistente/);
    expect(esJson.answer).not.toMatch(/assistant/);
    expect(esJson.error).toBe(esJson.answer);

    const en = await (await POST(req(body('en')))).json();
    expect(en.answer).toMatch(/assistant/);
  });

  it('refusal without a known language gives both', async () => {
    answer(refusalMessage());
    const { answer: a } = await (await POST(req(body()))).json();
    expect(a).toMatch(/asistente/);
    expect(a).toMatch(/assistant/);
  });

  it('max_tokens keeps the partial answer and flags it', async () => {
    answer(truncatedMessage('Brown rice works, but it needs'));
    const res = await POST(req(body('en')));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 'Brown rice works, but it needs', truncated: true });
  });

  it('max_tokens with no text says so instead of an empty bubble', async () => {
    answer(truncatedMessage(''));
    const res = await POST(req(body('es')));
    expect(res.status).toBe(502);
    expect((await res.json()).answer).toMatch(/cortó/);
  });

  it('a reply with no text block is a 502 message, not an undefined answer', async () => {
    answer(message({ content: [thinking()] }));
    const res = await POST(req(body('en')));
    expect(res.status).toBe(502);
    expect(typeof (await res.json()).answer).toBe('string');
  });

  it('still validates the request', async () => {
    expect((await POST(req({ question: 'x' }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
