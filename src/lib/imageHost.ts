/**
 * Which recipe image URLs are ours (Supabase public storage) and which are
 * hotlinks to someone else's site. next/image only optimizes hosts listed in
 * next.config.ts; any other host throws in `next dev` and 400s in production,
 * so unknown hosts are rendered with `unoptimized` (a plain <img>) instead.
 * Pure, so it is safe in client and server code.
 */

const DEFAULT_STORAGE_HOST = 'cjnwvxtomwyszcfuvgpw.supabase.co';
const PUBLIC_PREFIX = '/storage/v1/object/public/';

function storageHosts(): Set<string> {
  const hosts = new Set([DEFAULT_STORAGE_HOST]);
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (env) {
    try { hosts.add(new URL(env).hostname.toLowerCase()); } catch { /* ignore a malformed env value */ }
  }
  return hosts;
}

/** True for a public object in our own Supabase storage. */
export function isOwnStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && storageHosts().has(u.hostname.toLowerCase()) && u.pathname.startsWith(PUBLIC_PREFIX);
  } catch {
    return false;
  }
}

/** True for a hotlink: a non-empty URL that is not in our storage. */
export function isExternalImageUrl(url: string | null | undefined): boolean {
  return !!url && !!url.trim() && !isOwnStorageUrl(url) && !url.startsWith('/') && !url.startsWith('data:');
}

/** Whether next/image may run its optimizer for this src (ours, or a same-site path). */
export function canOptimizeImage(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  return isOwnStorageUrl(src);
}
