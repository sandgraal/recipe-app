import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { hubCorsHeaders } from '@/lib/hubCors';
import { checkRateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/requestBody';
import { logger } from '@/lib/logger';
import { aiModel } from '@/lib/ai';
import {
  ERROR_TEXT,
  MAX_BODY_BYTES,
  PROPOSAL_FALLBACK_TEXT,
  PROPOSE_VERSION_TOOL,
  buildMessages,
  chatRequestSchema,
  proposalSchema,
  systemPrompt,
  type ChatErrorCode,
} from '@/lib/cocinaChat';

/**
 * POST /api/cocina/chat: AI chat about one Cocina recipe for the finca hub.
 * Contract: docs/umbrella/cocina-chat-api.md in the Finca Colibrí repo.
 *
 * Auth is the signed-in hub user's Supabase access token, checked with
 * `finca_can_write` as that user (same as /api/auth/login): only finca admins
 * and editors may spend money here. The answer is a server-sent-event stream
 * (`delta` / `proposal` / `done` / `error`).
 *
 * Logs carry status, token usage and the user id, never recipe or chat text.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_OUTPUT_TOKENS = 4000;
const IP_LIMIT = { limit: 60, windowMs: 5 * 60_000 }; // before auth: cheap abuse guard
const USER_LIMIT = { limit: 20, windowMs: 5 * 60_000 }; // per signed-in user

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: hubCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const cors = hubCorsHeaders(req.headers.get('origin'));
  const reject = (status: number, error: string, code: string, extra: Record<string, string> = {}) => {
    logger.warn('cocina-chat', { status, code });
    return NextResponse.json({ error, code }, {
      status,
      headers: { ...cors, 'Cache-Control': 'no-store', ...extra },
    });
  };
  const limited = (retryAfter: number) =>
    reject(429, 'Too many requests', 'rate_limited', { 'Retry-After': String(retryAfter) });

  const ipLimited = await checkRateLimit(req, 'cocina-chat-ip', IP_LIMIT);
  if (ipLimited) return limited(ipLimited.retryAfter);

  const accessToken = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!accessToken) return reject(401, 'Sign in to use the chat', 'invalid_token');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !process.env.ANTHROPIC_API_KEY) {
    return reject(503, 'The chat is not configured', 'unavailable');
  }

  // Cheap early refusal; the real byte count is enforced again when reading.
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return reject(413, 'Request too large', 'too_large');
  }

  // Who is it, and may they write for the finca? Run as the user so auth.uid() is theirs.
  const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  const { data: userData, error: userError } = await createClient(url, anonKey, { auth: noSession })
    .auth.getUser(accessToken);
  if (userError || !userData?.user) return reject(401, 'Invalid or expired sign-in', 'invalid_token');
  const userId = userData.user.id;

  const asUser = createClient(url, anonKey, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: canWrite, error: rpcError } = await asUser.rpc('finca_can_write', {
    p_finca_id: process.env.FINCA_ID || 'colibri',
  });
  if (rpcError) return reject(503, 'Could not check permissions', 'unavailable');
  if (canWrite !== true) {
    return reject(403, 'Only finca admins and editors can use the chat', 'not_writer');
  }

  const userLimited = await checkRateLimit(req, `cocina-chat-user:${userId}`, USER_LIMIT);
  if (userLimited) return limited(userLimited.retryAfter);

  const raw = await readJsonBody(req, MAX_BODY_BYTES);
  if (!raw.ok) {
    return raw.status === 413
      ? reject(413, 'Request too large', 'too_large')
      : reject(400, raw.error, 'bad_request');
  }
  const parsed = chatRequestSchema.safeParse(raw.data);
  if (!parsed.success) {
    // Paths only: never echo values back (they are recipe and chat text).
    const where = parsed.error.issues.slice(0, 3).map(i => i.path.join('.') || '(body)').join(', ');
    return reject(400, `Invalid request: ${where}`, 'bad_request');
  }
  const body = parsed.data;

  const model = process.env.COCINA_CHAT_MODEL || aiModel();
  const client = new Anthropic({ maxRetries: 1, timeout: 55_000 });
  const enc = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener('abort', () => abort.abort());
  let open = true;

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          open = false; // the reader went away
        }
      };
      const fail = (code: ChatErrorCode) => send('error', { code, message: ERROR_TEXT[code][body.lang] });

      try {
        // Haiku 5.5: no `thinking` (adaptive by default), no sampling params.
        const stream = client.messages.stream({
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: systemPrompt(body.lang), cache_control: { type: 'ephemeral' } }],
          tools: [PROPOSE_VERSION_TOOL],
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
          messages: buildMessages(body),
        }, { signal: abort.signal });

        let wroteText = false;
        stream.on('text', text => {
          if (!text) return;
          wroteText = true;
          send('delta', { text });
        });

        const message = await stream.finalMessage();
        const usage = { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens };
        const stopReason = message.stop_reason ?? 'end_turn';
        const logUsage = { userId, model, stopReason, ...usage,
          cache_read: message.usage.cache_read_input_tokens ?? 0,
          cache_write: message.usage.cache_creation_input_tokens ?? 0 };

        if (stopReason === 'refusal') {
          logger.warn('cocina-chat', { status: 'refusal', ...logUsage });
          fail('refusal');
          return;
        }
        if (stopReason === 'max_tokens') {
          logger.warn('cocina-chat', { status: 'max_tokens', ...logUsage });
          fail('max_tokens');
          return;
        }

        // A proposal ends the turn here: the model was told to say what it
        // changed *before* calling the tool, so no tool_result round trip is
        // needed. If it skipped that sentence, a fixed one is sent instead.
        const call = message.content.find(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === PROPOSE_VERSION_TOOL.name,
        );
        if (call) {
          const proposal = proposalSchema.safeParse(call.input);
          if (!proposal.success) {
            logger.error('cocina-chat', { status: 'invalid_proposal', ...logUsage });
            fail('upstream');
            return;
          }
          if (!wroteText) send('delta', { text: PROPOSAL_FALLBACK_TEXT[body.lang] });
          send('proposal', proposal.data);
        }

        logger.info('cocina-chat', { status: 'ok', ...logUsage });
        send('done', { stopReason, usage });
      } catch (err) {
        if (err instanceof Anthropic.APIUserAbortError || abort.signal.aborted) {
          logger.info('cocina-chat', { status: 'aborted', userId });
          return;
        }
        logger.error('cocina-chat', { status: 'error', userId, ...describeError(err) });
        fail('upstream');
      } finally {
        if (open) {
          open = false;
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    },
    cancel() {
      open = false;
      abort.abort();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** Loggable facts about an SDK failure: class, HTTP status, request id; never the message body. */
function describeError(err: unknown): { kind: string; apiStatus?: number; requestId?: string | null } {
  if (err instanceof Anthropic.RateLimitError) return { kind: 'rate_limit', apiStatus: err.status, requestId: err.requestID };
  if (err instanceof Anthropic.AuthenticationError) return { kind: 'auth', apiStatus: err.status, requestId: err.requestID };
  if (err instanceof Anthropic.PermissionDeniedError) return { kind: 'permission', apiStatus: err.status, requestId: err.requestID };
  if (err instanceof Anthropic.BadRequestError) return { kind: 'bad_request', apiStatus: err.status, requestId: err.requestID };
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { kind: 'timeout' };
  if (err instanceof Anthropic.APIConnectionError) return { kind: 'connection' };
  if (err instanceof Anthropic.APIError) return { kind: 'api', apiStatus: err.status, requestId: err.requestID };
  return { kind: err instanceof Error ? err.name : 'unknown' };
}
