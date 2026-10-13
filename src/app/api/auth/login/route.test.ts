import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ADMIN_COOKIE, ADMIN_UI_COOKIE, adminSessionToken, writeAllowed } from '@/lib/adminAuth';

const getUser = vi.fn();
const rpc = vi.fn();
const createClient = vi.fn((_url: string, _key: string, opts?: { global?: { headers?: Record<string, string> } }) => {
  // The permission check uses the client that carries the user's bearer token.
  if (opts?.global?.headers?.Authorization) return { rpc };
  return { auth: { getUser } };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: (...a: Parameters<typeof createClient>) => createClient(...a) }));

const checkRateLimit = vi.fn();
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));

import { POST } from './route';

const SECRET = 'admin-secret-for-tests';

function post(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ENV_KEYS = ['ADMIN_PASSWORD', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'FINCA_ID'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.ADMIN_PASSWORD = SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-anon-key-anon-key';
  delete process.env.FINCA_ID;
  getUser.mockReset();
  rpc.mockReset();
  createClient.mockClear();
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue(null);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function cookieOf(res: Response, name: string) {
  return res.headers.getSetCookie().find(c => c.startsWith(`${name}=`));
}

describe('POST /api/auth/login — finca account', () => {
  it('sets the admin cookie for a token whose user can write', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });

    const res = await POST(post({ accessToken: 'good-token' }));

    expect(res.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith('good-token');
    expect(rpc).toHaveBeenCalledWith('finca_can_write', { p_finca_id: 'colibri' });
    // permission check runs as the user (bearer header on a second client)
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key-anon-key-anon-key',
      expect.objectContaining({ global: { headers: { Authorization: 'Bearer good-token' } } }),
    );
    const session = cookieOf(res, ADMIN_COOKIE);
    expect(session).toContain(adminSessionToken(SECRET)); // the SAME signed cookie as the password path
    expect(session).toMatch(/HttpOnly/i);
    expect(cookieOf(res, ADMIN_UI_COOKIE)).toContain('=1');
  });

  it('honours FINCA_ID', async () => {
    process.env.FINCA_ID = 'otra';
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    await POST(post({ accessToken: 't' }));
    expect(rpc).toHaveBeenCalledWith('finca_can_write', { p_finca_id: 'otra' });
  });

  it('403 and no cookie when finca_can_write is false (not a member / viewer)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });

    const res = await POST(post({ accessToken: 'viewer-token' }));

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('not_writer');
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('401 and no cookie for a bad token, without calling the RPC', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });

    const res = await POST(post({ accessToken: 'garbage' }));

    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('fails closed (502, no cookie) when the permission check errors', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await POST(post({ accessToken: 't' }));

    expect(res.status).toBe(502);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('only accepts a literal true from the RPC', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    rpc.mockResolvedValue({ data: 'true', error: null });
    expect((await POST(post({ accessToken: 't' }))).status).toBe(403);
  });

  it('applies rate limiting before any Supabase call', async () => {
    checkRateLimit.mockResolvedValue({ retryAfter: 30 });
    const res = await POST(post({ accessToken: 't' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(getUser).not.toHaveBeenCalled();
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('503 when ADMIN_PASSWORD (the cookie secret) is not configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = await POST(post({ accessToken: 't' }));
    expect(res.status).toBe(503);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('503 when the Supabase public env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await POST(post({ accessToken: 't' }));
    expect(res.status).toBe(503);
  });
});

describe('POST /api/auth/login — password fallback', () => {
  it('still issues the cookie for the right admin password (no Supabase involved)', async () => {
    const res = await POST(post({ password: SECRET }));
    expect(res.status).toBe(200);
    expect(cookieOf(res, ADMIN_COOKIE)).toContain(adminSessionToken(SECRET));
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects a wrong password and malformed bodies with 401 and no cookie', async () => {
    for (const body of [{ password: 'nope' }, {}, 'not json{']) {
      const res = await POST(post(body));
      expect(res.status).toBe(401);
      expect(res.headers.getSetCookie()).toEqual([]);
    }
  });
});

describe('Bearer ADMIN_PASSWORD on write routes (writeAllowed) is untouched', () => {
  it('accepts the bearer header, the session cookie, and nothing else', () => {
    const mk = (headers: Record<string, string>) => new NextRequest('http://localhost/api/recipes', { method: 'POST', headers });
    expect(writeAllowed(mk({ authorization: `Bearer ${SECRET}` }))).toBe(true);
    expect(writeAllowed(mk({ cookie: `${ADMIN_COOKIE}=${adminSessionToken(SECRET)}` }))).toBe(true);
    expect(writeAllowed(mk({ authorization: 'Bearer wrong' }))).toBe(false);
    expect(writeAllowed(mk({}))).toBe(false);
  });
});
