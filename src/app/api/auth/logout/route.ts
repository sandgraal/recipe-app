import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_UI_COOKIE } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Clears the admin session + UI cookies. */
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(ADMIN_UI_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
