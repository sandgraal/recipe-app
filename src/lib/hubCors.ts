/**
 * CORS for the finca hub (a static site on another origin) calling
 * `/api/cocina/chat`. Deliberately separate from `cors.ts`, which stays locked
 * to the recipe site's own origin for every other route.
 *
 * Allowed origins come from `HUB_ORIGINS` (comma separated, read at request
 * time). Only an exact match is echoed back; anything else gets no CORS headers
 * at all, so the browser refuses the response.
 */
export const DEFAULT_HUB_ORIGINS = [
  'https://sandgraal.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

export function hubOrigins(): string[] {
  const raw = process.env.HUB_ORIGINS;
  const list = (raw ?? '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length ? list : DEFAULT_HUB_ORIGINS;
}

/** CORS headers for this request's `Origin`, or `{}` when it is not allowed. */
export function hubCorsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = { Vary: 'Origin' };
  if (!origin || !hubOrigins().includes(origin)) return base;
  return {
    ...base,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
  };
}
