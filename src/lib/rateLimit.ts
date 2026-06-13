import { NextRequest } from 'next/server';

/**
 * Lightweight in-memory rate limiter for the AI/import endpoints.
 *
 * These routes call the Anthropic API, so unbounded access is a denial-of-wallet
 * risk on a public site. This is a per-instance in-memory token bucket — a first
 * line of defense that blunts naive abuse with zero extra infrastructure. For
 * production-grade, multi-instance limiting, upgrade to Vercel Firewall or an
 * Upstash-backed limiter (tracked as a follow-up); the call sites won't change.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: NextRequest): string {
  // Prefer x-real-ip (Vercel sets it to the true client IP). Fall back to the
  // LAST x-forwarded-for entry — the hop appended by the trusted proxy — since
  // the earlier entries are client-supplied and spoofable.
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

/**
 * Returns { ok } — false when the caller has exceeded `limit` requests within
 * `windowMs`. Sweeps expired buckets opportunistically to bound memory.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/**
 * Convenience guard for route handlers. Returns a 429 Response when limited,
 * or null when the request may proceed. `bucket` namespaces the limit per route.
 */
export function checkRateLimit(
  req: NextRequest,
  bucket: string,
  opts: { limit: number; windowMs: number } = { limit: 20, windowMs: 60_000 },
): { retryAfter: number } | null {
  const { ok, retryAfter } = rateLimit(`${bucket}:${clientIp(req)}`, opts.limit, opts.windowMs);
  return ok ? null : { retryAfter };
}
