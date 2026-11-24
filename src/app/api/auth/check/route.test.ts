import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminSessionToken } from '@/lib/adminAuth';
import { GET } from './route';

const SECRET = 'admin-secret-for-tests';
const get = (headers: Record<string, string> = {}) => new NextRequest('http://localhost/api/auth/check', { headers });

const ENV_KEYS = ['ADMIN_PASSWORD', 'VERCEL_ENV', 'NODE_ENV'] as const;
const saved: Record<string, string | undefined> = {};
const env = process.env as Record<string, string | undefined>;

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = env[k];
  env.ADMIN_PASSWORD = SECRET;
  delete env.VERCEL_ENV;
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete env[k];
    else env[k] = saved[k];
  }
});

describe('GET /api/auth/check', () => {
  it('200 for the right Bearer password', async () => {
    const res = await GET(get({ Authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('200 for a valid admin session cookie', async () => {
    const res = await GET(get({ cookie: `${ADMIN_COOKIE}=${adminSessionToken(SECRET)}` }));
    expect(res.status).toBe(200);
  });

  it('401 with no credential', async () => {
    expect((await GET(get())).status).toBe(401);
  });

  it('401 with a wrong password, and never echoes the secret', async () => {
    const res = await GET(get({ Authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
  });

  it('401 on a production deploy where ADMIN_PASSWORD is unset (default-deny)', async () => {
    delete env.ADMIN_PASSWORD;
    env.VERCEL_ENV = 'production';
    expect((await GET(get())).status).toBe(401);
  });
});
