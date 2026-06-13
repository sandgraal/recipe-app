import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { ADMIN_COOKIE, ADMIN_UI_COOKIE } from '@/lib/authConstants';

/**
 * Server-side authorization for admin/write API routes.
 *
 * Safe-by-default: if `ADMIN_PASSWORD` is NOT set in the environment, writes
 * stay open (the app's original behavior) so nothing breaks until you opt in.
 * Once `ADMIN_PASSWORD` is configured, guarded routes require EITHER:
 *   - an httpOnly session cookie set by POST /api/auth/login (browser admin), or
 *   - `Authorization: Bearer <ADMIN_PASSWORD>` (the publish script via
 *     RECIPE_ADMIN_TOKEN, or any CLI).
 *
 * The cookie path replaces the old scheme where the password was hardcoded in
 * the client bundle and mirrored into localStorage (readable by any script or
 * XSS). httpOnly means client JS can't read the session value.
 */
export { ADMIN_COOKIE, ADMIN_UI_COOKIE };

/**
 * Opaque session value derived from the admin password via HMAC. Stored in the
 * cookie instead of the raw password, so the password isn't sent on every
 * request or captured by anything that logs Cookie headers. Possessing the token
 * still grants access (no server-side store), but it doesn't reveal the secret.
 */
export function adminSessionToken(secret: string): string {
  return createHmac('sha256', secret).update('colibri-admin-session-v1').digest('hex');
}

export function writeAllowed(req: NextRequest): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return true; // not configured → open (backward compatible)
  const viaBearer = (req.headers.get('authorization') || '') === `Bearer ${secret}`;
  const viaCookie = req.cookies.get(ADMIN_COOKIE)?.value === adminSessionToken(secret);
  return viaBearer || viaCookie;
}

/** Whether the request carries a valid admin session cookie (for UI gating). */
export function isAdminSession(req: NextRequest): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  return req.cookies.get(ADMIN_COOKIE)?.value === adminSessionToken(secret);
}
