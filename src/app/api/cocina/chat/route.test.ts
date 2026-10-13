import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ── Mocks: Supabase, the rate limiter and the logger. The Anthropic SDK is
// real (so its error classes are real) with `Messages.prototype.stream` spied.
const sb = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: sb.createClient }));

const rl = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: rl.check }));

const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: log }));

import { POST, OPTIONS } from './route';

// ── Helpers ──────────────────────────────────────────────────────────────────
const ORIGIN = 'https://sandgraal.github.io';
const USER_ID = '11111111-2222-3333-4444-555555555555';
const SECRET_TITLE = 'Salsa Secreta del Colibri';
const SECRET_QUESTION = 'pregunta-privada-xyz';

const goodBody = () => ({
  lang: 'es',
  formula: {
    title: SECRET_TITLE,
    ingredients: [{ amount: '200', unit: 'g', item: 'chile habanero' }, { item: 'vinagre' }],
    steps: ['Licuar todo', 'Hervir'],
    notes: 'tapa de vidrio',
  },
  context: { problems: ['muy picante'], garden: [{ ingredient: 'chile habanero', status: 'planted' }] },
  messages: [{ role: 'user', content: SECRET_QUESTION }],
});

function req(body: unknown, headers: Record<string, string> = {}, raw?: string) {
  return new NextRequest('http://localhost/api/cocina/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: 'Bearer good-token', 'Content-Type': 'application/json', ...headers },
    body: raw ?? JSON.stringify(body),
  });
}

type Evt = { event: string; data: Record<string, unknown> };
async function readSse(res: Response): Promise<Evt[]> {
  const text = await res.text();
  return text.split('\n\n').filter(Boolean).map(block => {
    const lines = block.split('\n');
    return {
      event: lines.find(l => l.startsWith('event: '))!.slice(7),
      data: JSON.parse(lines.find(l => l.startsWith('data: '))!.slice(6)),
    };
  });
}

function message(over: Partial<Anthropic.Message> = {}): Anthropic.Message {
  return {
    id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5',
    content: [{ type: 'text', text: 'ok', citations: null }],
    stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 30 },
    ...over,
  } as Anthropic.Message;
}

/** Stand-in for the SDK's MessageStream: `.on('text')` + `.finalMessage()`. */
function fakeStream(chunks: string[], result: Anthropic.Message | Error) {
  const textHandlers: ((delta: string, snapshot: string) => void)[] = [];
  const stream = {
    on(event: string, cb: (delta: string, snapshot: string) => void) {
      if (event === 'text') textHandlers.push(cb);
      return stream;
    },
    async finalMessage() {
      let snap = '';
      for (const c of chunks) { snap += c; textHandlers.forEach(h => h(c, snap)); }
      if (result instanceof Error) throw result;
      return result;
    },
  };
  return stream;
}

let streamSpy: ReturnType<typeof vi.spyOn>;
const useStream = (chunks: string[], result: Anthropic.Message | Error) =>
  streamSpy.mockImplementation((() => fakeStream(chunks, result)) as never);

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-anon-key-anon-key';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  delete process.env.FINCA_ID;
  delete process.env.HUB_ORIGINS;
  delete process.env.COCINA_CHAT_MODEL;

  sb.getUser.mockReset().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  sb.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  sb.createClient.mockReset().mockImplementation(() => ({ auth: { getUser: sb.getUser }, rpc: sb.rpc }));
  rl.check.mockReset().mockResolvedValue(null);
  log.info.mockReset(); log.warn.mockReset(); log.error.mockReset();

  streamSpy = vi.spyOn(Anthropic.Messages.prototype, 'stream');
  useStream(['Hola'], message());
});

afterEach(() => { streamSpy.mockRestore(); });

// ── CORS ─────────────────────────────────────────────────────────────────────
describe('OPTIONS (CORS preflight)', () => {
  const pre = (origin: string) =>
    OPTIONS(new NextRequest('http://localhost/api/cocina/chat', { method: 'OPTIONS', headers: { Origin: origin } }));

  it('answers an allowed origin with 204 and the matching origin only', async () => {
    const res = await pre(ORIGIN);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Authorization, Content-Type');
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('answers a disallowed origin with 204 and no CORS headers', async () => {
    const res = await pre('https://evil.example');
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(res.headers.get('Access-Control-Allow-Methods')).toBeNull();
  });

  it('honours HUB_ORIGINS', async () => {
    process.env.HUB_ORIGINS = 'https://hub.example';
    expect((await pre('https://hub.example')).headers.get('Access-Control-Allow-Origin')).toBe('https://hub.example');
    expect((await pre(ORIGIN)).headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

// ── Errors before the stream starts ──────────────────────────────────────────
describe('POST before streaming', () => {
  it('401 without a bearer token', async () => {
    const res = await POST(req(goodBody(), { Authorization: '' }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('invalid_token');
    expect(streamSpy).not.toHaveBeenCalled();
  });

  it('401 for a bad token, with CORS headers for the hub', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await POST(req(goodBody()));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('invalid_token');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(streamSpy).not.toHaveBeenCalled();
  });

  it('403 for a signed-in user who cannot write for the finca', async () => {
    sb.rpc.mockResolvedValue({ data: false, error: null });
    const res = await POST(req(goodBody()));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('not_writer');
    expect(streamSpy).not.toHaveBeenCalled();
  });

  it('checks finca_can_write for FINCA_ID (default colibri) as the user', async () => {
    await POST(req(goodBody()));
    expect(sb.rpc).toHaveBeenCalledWith('finca_can_write', { p_finca_id: 'colibri' });
    const asUser = sb.createClient.mock.calls.find(c => c[2]?.global?.headers)!;
    expect(asUser[2].global.headers.Authorization).toBe('Bearer good-token');

    process.env.FINCA_ID = 'otra';
    await POST(req(goodBody()));
    expect(sb.rpc).toHaveBeenLastCalledWith('finca_can_write', { p_finca_id: 'otra' });
  });

  it('503 when the permission check itself fails', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await POST(req(goodBody()));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('unavailable');
  });

  it('503 when the Anthropic key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(req(goodBody()));
    expect(res.status).toBe(503);
  });

  it('413 for a body over 64 KB (measured bytes)', async () => {
    const big = goodBody();
    big.messages = [{ role: 'user', content: 'x'.repeat(70 * 1024) }];
    const res = await POST(req(big));
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('too_large');
    expect(streamSpy).not.toHaveBeenCalled();
  });

  it('413 early when Content-Length already says it is too big', async () => {
    const res = await POST(req(goodBody(), { 'Content-Length': String(200 * 1024) }));
    expect(res.status).toBe(413);
  });

  it('400 for invalid JSON', async () => {
    const res = await POST(req(null, {}, '{nope'));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('bad_request');
  });

  it('400 for a body that fails validation, without echoing its contents', async () => {
    const bad = goodBody();
    bad.messages = [{ role: 'assistant', content: SECRET_QUESTION }];
    const res = await POST(req(bad));
    expect(res.status).toBe(400);
    const text = JSON.stringify(await res.json());
    expect(text).toContain('messages');
    expect(text).not.toContain(SECRET_QUESTION);
    expect(streamSpy).not.toHaveBeenCalled();
  });

  it('429 with Retry-After when the rate limit trips', async () => {
    rl.check.mockResolvedValue({ retryAfter: 42 });
    const res = await POST(req(goodBody()));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    expect((await res.json()).code).toBe('rate_limited');
  });

  it('rate-limits per user after authentication', async () => {
    await POST(req(goodBody()));
    const buckets = rl.check.mock.calls.map(c => c[1]);
    expect(buckets).toContain('cocina-chat-ip');
    expect(buckets).toContain(`cocina-chat-user:${USER_ID}`);
  });
});

// ── The SSE stream ───────────────────────────────────────────────────────────
describe('POST streaming', () => {
  it('streams delta events then done with usage', async () => {
    useStream(['Hola ', 'mundo'], message({ usage: { input_tokens: 321, output_tokens: 45 } } as Partial<Anthropic.Message>));
    const res = await POST(req(goodBody()));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/^text\/event-stream/);
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const events = await readSse(res);
    expect(events.map(e => e.event)).toEqual(['delta', 'delta', 'done']);
    expect(events[0].data).toEqual({ text: 'Hola ' });
    expect(events[1].data).toEqual({ text: 'mundo' });
    expect(events[2].data).toEqual({ stopReason: 'end_turn', usage: { input_tokens: 321, output_tokens: 45 } });
  });

  it('calls Haiku 5.5 with the agreed request shape', async () => {
    await (await POST(req(goodBody()))).text();
    expect(streamSpy).toHaveBeenCalledTimes(1);
    const [params, opts] = streamSpy.mock.calls[0] as unknown as [Anthropic.MessageStreamParams, { signal: AbortSignal }];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.max_tokens).toBe(4000);
    expect(params.output_config).toEqual({ effort: 'low' });
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('temperature');
    expect(params.tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    expect(params.tools).toHaveLength(1);
    expect((params.tools![0] as Anthropic.Tool).name).toBe('propose_version');
    expect((params.tools![0] as Anthropic.Tool).strict).toBe(true);
    const system = params.system as Anthropic.TextBlockParam[];
    expect(system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(system[0].text).toMatch(/Spanish/);
    expect(system[0].text).not.toContain(SECRET_TITLE); // recipe text never in the system prompt
    const first = params.messages[0];
    expect(first.role).toBe('user');
    expect(String(first.content)).toContain('<finca_data>');
    expect(String(first.content)).toContain(SECRET_TITLE);
    expect(params.messages[params.messages.length - 1]).toEqual({ role: 'user', content: SECRET_QUESTION });
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('lets COCINA_CHAT_MODEL override the model and uses English for lang=en', async () => {
    process.env.COCINA_CHAT_MODEL = 'claude-sonnet-5-5';
    await (await POST(req({ ...goodBody(), lang: 'en' }))).text();
    const [params] = streamSpy.mock.calls[0] as unknown as [Anthropic.MessageStreamParams];
    expect(params.model).toBe('claude-sonnet-5-5');
    expect((params.system as Anthropic.TextBlockParam[])[0].text).toMatch(/Answer in English/);
  });

  it('turns a propose_version tool_use block into a proposal event', async () => {
    const input = {
      label: 'Menos picante', title: SECRET_TITLE, yieldText: '2 frascos', servings: 8,
      ingredients: [{ amount: '100', unit: 'g', item: 'chile habanero' }, { item: 'vinagre', notes: 'blanco' }],
      steps: ['Licuar', 'Hervir 10 min'], notes: 'Mide el pH.', why: 'Menos chile para bajar el picante.',
    };
    useStream(['Reduje el chile. '], message({
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'Reduje el chile. ', citations: null },
        { type: 'tool_use', id: 'toolu_1', name: 'propose_version', input, caller: { type: 'direct' } },
      ],
    } as Partial<Anthropic.Message>));

    const events = await readSse(await POST(req(goodBody())));
    expect(events.map(e => e.event)).toEqual(['delta', 'proposal', 'done']);
    expect(events[1].data).toEqual(input);
    expect(events[2].data.stopReason).toBe('tool_use');
    // One request only: no tool_result follow-up.
    expect(streamSpy).toHaveBeenCalledTimes(1);
  });

  it('adds a short fixed sentence when the model proposed without writing any text', async () => {
    useStream([], message({
      stop_reason: 'tool_use',
      content: [{
        type: 'tool_use', id: 'toolu_1', name: 'propose_version', caller: { type: 'direct' },
        input: { label: 'v2', title: 'T', ingredients: [{ item: 'a' }], steps: ['b'], why: 'c' },
      }],
    } as Partial<Anthropic.Message>));
    const events = await readSse(await POST(req(goodBody())));
    expect(events.map(e => e.event)).toEqual(['delta', 'proposal', 'done']);
    expect(String(events[0].data.text)).toMatch(/pH/);
  });

  it('reports a malformed proposal as an upstream error, not a proposal', async () => {
    useStream([], message({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 't', name: 'propose_version', input: { label: 'x' }, caller: { type: 'direct' } }],
    } as Partial<Anthropic.Message>));
    const events = await readSse(await POST(req(goodBody())));
    expect(events.map(e => e.event)).toEqual(['error']);
    expect(events[0].data.code).toBe('upstream');
  });

  it('turns stop_reason refusal into an error event (and no done)', async () => {
    useStream(['No pue'], message({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: null } } as Partial<Anthropic.Message>));
    const events = await readSse(await POST(req(goodBody())));
    expect(events.map(e => e.event)).toEqual(['delta', 'error']);
    expect(events[1].data.code).toBe('refusal');
    expect(typeof events[1].data.message).toBe('string');
  });

  it('turns stop_reason max_tokens into an error event', async () => {
    useStream(['largo...'], message({ stop_reason: 'max_tokens' }));
    const events = await readSse(await POST(req(goodBody())));
    expect(events.map(e => e.event)).toEqual(['delta', 'error']);
    expect(events[1].data.code).toBe('max_tokens');
  });

  it('turns an SDK RateLimitError into an upstream error event, in the request language', async () => {
    const err = Anthropic.APIError.generate(
      429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, 'slow down', new Headers({ 'request-id': 'req_1' }),
    );
    expect(err).toBeInstanceOf(Anthropic.RateLimitError);
    useStream([], err as Error);
    const es = await readSse(await POST(req(goodBody())));
    expect(es).toHaveLength(1);
    expect(es[0].event).toBe('error');
    expect(es[0].data.code).toBe('upstream');

    useStream([], err as Error);
    const en = await readSse(await POST(req({ ...goodBody(), lang: 'en' })));
    expect(en[0].data.message).not.toBe(es[0].data.message);
    expect(log.error).toHaveBeenCalledWith('cocina-chat', expect.objectContaining({ kind: 'rate_limit', apiStatus: 429, userId: USER_ID }));
  });

  it('turns a connection failure or an unexpected error into an upstream error event', async () => {
    useStream([], new Anthropic.APIConnectionError({ message: 'offline' }));
    expect((await readSse(await POST(req(goodBody()))))[0].data.code).toBe('upstream');
    useStream([], new Error('kaput'));
    expect((await readSse(await POST(req(goodBody()))))[0].data.code).toBe('upstream');
  });

  it('logs status, usage and user id, never recipe or message content', async () => {
    useStream([SECRET_QUESTION], message({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 't', name: 'propose_version', input: { label: 'x' }, caller: { type: 'direct' } }],
    } as Partial<Anthropic.Message>));
    await (await POST(req(goodBody()))).text();
    useStream(['Hola'], message({ usage: { input_tokens: 9, output_tokens: 3 } } as Partial<Anthropic.Message>));
    await (await POST(req(goodBody()))).text();
    useStream([], new Error(`failed on ${SECRET_TITLE}`));
    await (await POST(req(goodBody()))).text();

    const logged = JSON.stringify([log.info.mock.calls, log.warn.mock.calls, log.error.mock.calls]);
    expect(logged).not.toContain(SECRET_TITLE);
    expect(logged).not.toContain(SECRET_QUESTION);
    expect(logged).not.toContain('chile habanero');
    expect(log.info).toHaveBeenCalledWith('cocina-chat', expect.objectContaining({
      status: 'ok', userId: USER_ID, input_tokens: 9, output_tokens: 3,
    }));
  });
});
