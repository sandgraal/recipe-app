/**
 * True only on a real PRODUCTION deploy — not a Vercel Preview.
 *
 * On Vercel, NODE_ENV is "production" for BOTH production and preview builds, so
 * checking NODE_ENV alone would treat previews as prod (denying writes, emitting
 * prod-only errors). VERCEL_ENV distinguishes them ("production" | "preview" |
 * "development"); fall back to NODE_ENV off Vercel.
 */
export function isProduction(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) return vercelEnv === 'production';
  return process.env.NODE_ENV === 'production';
}
