import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_UI_COOKIE, adminSessionToken } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST { password } → validates against ADMIN_PASSWORD server-side and, on
 * success, sets an httpOnly session cookie (the real auth) plus a non-secret,
 * JS-readable hint cookie that toggles the admin UI. The password never lives
 * in the client bundle anymore.
 *
 * (The cookie value is the secret itself, httpOnly; a signed/opaque session
 * token is a planned hardening — see Phase 3.)
 */
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, 'auth-login', { limit: 10, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json({ error: 'Too many attempts' }, {
      status: 429,
      headers: { ...CORS_HEADERS, 'Retry-After': String(limited.retryAfter) },
    });
  }

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503, headers: CORS_HEADERS });
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch { /* malformed body → treated as invalid */ }

  if (!password || password !== secret) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: CORS_HEADERS });
  }

  const res = NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ADMIN_COOKIE, adminSessionToken(secret), { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
  res.cookies.set(ADMIN_UI_COOKIE, '1', { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
  return res;
}
