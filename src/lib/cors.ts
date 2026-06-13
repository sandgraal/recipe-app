/**
 * Shared CORS headers for API routes.
 *
 * Previously every route returned `Access-Control-Allow-Origin: *`, which let
 * any website call the API from a victim's browser (CSRF / cost-abuse vector).
 * We now restrict cross-origin browser access to the app's own origin.
 *
 * Notes:
 * - Same-origin requests (the app calling its own /api, in prod, preview, or
 *   local dev) are NOT subject to CORS, so this won't break those.
 * - Non-browser clients (e.g. the publish script via curl/python) don't enforce
 *   CORS at all, so they're unaffected.
 * - Override the allowed origin per-environment with NEXT_PUBLIC_SITE_URL.
 */
import { SITE_URL } from '@/lib/site';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Vary': 'Origin',
};

// Always serve fresh data for mutations; reads may override (see Phase 1 caching).
export const NO_STORE = { 'Cache-Control': 'no-store, must-revalidate' };
