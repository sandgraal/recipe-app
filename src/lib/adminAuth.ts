import { NextRequest } from 'next/server';

/**
 * Server-side authorization for admin/write API routes.
 *
 * Safe-by-default: if `ADMIN_PASSWORD` is NOT set in the environment, writes
 * stay open (the app's original behavior) so nothing breaks until you opt in.
 * Once `ADMIN_PASSWORD` is configured (e.g. in Vercel), guarded routes require
 *   Authorization: Bearer <ADMIN_PASSWORD>
 * The browser admin sends this automatically after login (see useAdmin); the
 * publish script can send it via the RECIPE_ADMIN_TOKEN env var.
 */
export function writeAllowed(req: NextRequest): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return true; // not configured → open (backward compatible)
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`;
}
