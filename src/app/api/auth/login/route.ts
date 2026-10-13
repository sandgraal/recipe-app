import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_COOKIE, ADMIN_UI_COOKIE, adminSessionToken } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function fail(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status, headers: CORS_HEADERS });
}

/** Issues the admin session cookies (the one and only session system). */
function sessionResponse(secret: string) {
  const res = NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ADMIN_COOKIE, adminSessionToken(secret), { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
  res.cookies.set(ADMIN_UI_COOKIE, '1', { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
  return res;
}

/**
 * Finca account sign-in. The browser signs in with Supabase Auth and sends the
 * resulting access token; we (1) verify it with Supabase, (2) ask the database
 * whether that user may write for the finca (`finca_can_write`, run as the user
 * so `auth.uid()` is theirs), and only then (3) issue the usual admin cookie.
 * Supabase tokens are never stored by this app: the httpOnly cookie is the
 * session.
 */
async function loginWithFincaToken(accessToken: string, secret: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fail(503, 'Sign-in is not configured', 'unavailable');

  const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

  const verifier = createClient(url, anonKey, { auth: noSession });
  const { data: userData, error: userError } = await verifier.auth.getUser(accessToken);
  if (userError || !userData?.user) return fail(401, 'Invalid or expired sign-in', 'invalid_token');

  const asUser = createClient(url, anonKey, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: canWrite, error: rpcError } = await asUser.rpc('finca_can_write', {
    p_finca_id: process.env.FINCA_ID || 'colibri',
  });
  if (rpcError) return fail(502, 'Could not check permissions', 'unavailable');
  if (canWrite !== true) {
    return fail(403, 'This account is not an editor of the finca (not a member, or read-only)', 'not_writer');
  }

  return sessionResponse(secret);
}

/**
 * POST { accessToken } → finca account sign-in (see above), or
 * POST { password }    → validates against ADMIN_PASSWORD (fallback).
 * Either way, success sets an httpOnly session cookie (the real auth) plus a
 * non-secret, JS-readable hint cookie that toggles the admin UI.
 * `Authorization: Bearer <ADMIN_PASSWORD>` on write routes is untouched.
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'auth-login', { limit: 10, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json({ error: 'Too many attempts', code: 'rate_limited' }, {
      status: 429,
      headers: { ...CORS_HEADERS, 'Retry-After': String(limited.retryAfter) },
    });
  }

  // The session cookie is derived from ADMIN_PASSWORD, so both paths need it.
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return fail(503, 'Admin login is not configured', 'unavailable');

  let password = '';
  let accessToken = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
    accessToken = typeof body?.accessToken === 'string' ? body.accessToken : '';
  } catch { /* malformed body → treated as invalid */ }

  if (accessToken) return loginWithFincaToken(accessToken, secret);

  if (!password || password !== secret) return fail(401, 'Invalid credentials', 'invalid_credentials');
  return sessionResponse(secret);
}
