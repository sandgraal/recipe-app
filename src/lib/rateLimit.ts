import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiter for the AI / import / auth endpoints (denial-of-wallet defense).
 *
 * Uses a shared Upstash Redis store when UPSTASH_REDIS_REST_URL/TOKEN are set,
 * so the limit is enforced across every serverless instance. Falls back to a
 * per-instance in-memory token bucket otherwise (works with zero config, but
 * only blunts naive abuse since each instance keeps its own counter).
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

/** Per-instance in-memory token bucket (fallback when Upstash isn't configured). */
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

// ── Shared Upstash store (used when configured) ───────────────────────────────
let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

const limiters = new Map<string, Ratelimit>();
function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cacheKey = `${limit}:${windowMs}`;
  let rl = limiters.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms` as `${number} ms`),
      prefix: 'colibri-rl',
      analytics: false,
    });
    limiters.set(cacheKey, rl);
  }
  return rl;
}

/**
 * Route-handler guard. Returns `{ retryAfter }` when the caller is limited, or
 * null when the request may proceed. Prefers the shared Upstash store; falls
 * back to in-memory. `bucket` namespaces the limit per route.
 */
export async function checkRateLimit(
  req: NextRequest,
  bucket: string,
  opts: { limit: number; windowMs: number } = { limit: 20, windowMs: 60_000 },
): Promise<{ retryAfter: number } | null> {
  const id = `${bucket}:${clientIp(req)}`;
  const rl = getLimiter(opts.limit, opts.windowMs);
  if (rl) {
    try {
      const res = await rl.limit(id);
      if (res.success) return null;
      return { retryAfter: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
    } catch {
      // Upstash unreachable — fall through to the in-memory limiter.
    }
  }
  const { ok, retryAfter } = rateLimit(id, opts.limit, opts.windowMs);
  return ok ? null : { retryAfter };
}
