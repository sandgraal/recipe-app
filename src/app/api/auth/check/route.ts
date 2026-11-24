import { NextRequest, NextResponse } from 'next/server';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...NO_STORE } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Whether this request would be allowed to write (admin cookie or
 * `Authorization: Bearer <ADMIN_PASSWORD>`). Changes nothing and returns no
 * secrets. Agents call it first (publish_recipe.py --check) so a missing or
 * wrong credential is reported precisely instead of as a failed publish.
 */
export async function GET(req: NextRequest) {
  if (!writeAllowed(req)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return json({ ok: true });
}
