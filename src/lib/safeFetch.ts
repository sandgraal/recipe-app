import { isPublicHttpUrl } from '@/lib/ssrf';

/**
 * Fetch following redirects MANUALLY, re-validating every hop against
 * isPublicHttpUrl, so a public URL can't 30x-redirect into a private/internal
 * target (the redirect-based SSRF bypass). Caps redirect depth.
 */
export async function safeFetch(
  initialUrl: string,
  opts: { maxRedirects?: number; timeoutMs?: number; accept?: string } = {},
): Promise<Response> {
  const { maxRedirects = 4, timeoutMs = 15000, accept } = opts;
  let current = initialUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!isPublicHttpUrl(current)) throw new Error('blocked-url');
    const res = await fetch(current, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)', ...(accept ? { Accept: accept } : {}) },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('too-many-redirects');
}
