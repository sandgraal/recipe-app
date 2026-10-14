import { isOwnStorageUrl } from '@/lib/imageHost';
import { isPublicHttpUrl } from '@/lib/ssrf';
import { safeFetch } from '@/lib/safeFetch';

/**
 * Copy a recipe photo that lives on someone else's site into our public
 * `recipe-images` bucket, so the recipe never depends on a hotlink. The decision
 * logic (what counts as an acceptable download) is pure and tested; the network
 * and storage parts are injected so tests never touch either.
 */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const DOWNLOAD_TIMEOUT_MS = 12_000;
export const BUCKET = 'recipe-images';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export type RehostFailure = 'blocked' | 'fetch_failed' | 'not_image' | 'too_large' | 'upload_failed';

export type RehostResult =
  | { ok: true; url: string; unchanged: boolean }
  | { ok: false; reason: RehostFailure };

/** Media type of a Content-Type header ("image/JPEG; charset=x" -> "image/jpeg"). */
export function mediaType(header: string | null | undefined): string {
  return (header || '').split(';')[0].trim().toLowerCase();
}

/** File extension for an accepted image type, or null for anything else (SVG and HTML are refused). */
export function imageExtension(header: string | null | undefined): string | null {
  return EXT_BY_TYPE[mediaType(header)] ?? null;
}

/** Decide from the response head whether a download is worth reading. */
export function checkImageResponse(
  head: { ok: boolean; contentType: string | null | undefined; contentLength: string | number | null | undefined },
  maxBytes = MAX_IMAGE_BYTES,
): { ok: true; contentType: string; ext: string } | { ok: false; reason: RehostFailure } {
  if (!head.ok) return { ok: false, reason: 'fetch_failed' };
  const ext = imageExtension(head.contentType);
  if (!ext) return { ok: false, reason: 'not_image' };
  const len = Number(head.contentLength);
  if (head.contentLength != null && head.contentLength !== '' && Number.isFinite(len) && len > maxBytes) {
    return { ok: false, reason: 'too_large' };
  }
  return { ok: true, contentType: mediaType(head.contentType), ext };
}

/** Read a body into a buffer, giving up as soon as it passes `maxBytes` (a missing or lying Content-Length). */
export async function readCapped(body: ReadableStream<Uint8Array> | null, maxBytes = MAX_IMAGE_BYTES): Promise<Buffer | 'too_large' | null> {
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return 'too_large';
    }
    chunks.push(value);
  }
  return total === 0 ? null : Buffer.concat(chunks);
}

/** A unique object name for a re-hosted photo. */
export function rehostPath(ext: string, now = Date.now(), rand = Math.random().toString(36).slice(2, 10)): string {
  return `recipe-rehost-${now}-${rand}.${ext}`;
}

/** The slice of the Supabase storage client this needs (so tests can fake it). */
export interface StorageLike {
  storage: {
    from(bucket: string): {
      upload(path: string, body: Buffer, opts: { contentType: string; upsert: boolean }): Promise<{ error: unknown }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
}

export interface RehostDeps {
  fetchImage?: (url: string) => Promise<Response>;
  now?: () => number;
}

/**
 * Re-host `url`. A URL that is already in our storage is returned unchanged.
 * Never throws: every failure is a reason, and callers then save no image
 * rather than the hotlink.
 */
export async function rehostImage(url: string, storage: StorageLike, deps: RehostDeps = {}): Promise<RehostResult> {
  if (isOwnStorageUrl(url)) return { ok: true, url, unchanged: true };
  if (!isPublicHttpUrl(url)) return { ok: false, reason: 'blocked' };

  const fetchImage = deps.fetchImage ?? ((u: string) => safeFetch(u, { timeoutMs: DOWNLOAD_TIMEOUT_MS, accept: 'image/*' }));
  let res: Response;
  try {
    res = await fetchImage(url);
  } catch (err) {
    return { ok: false, reason: String(err).includes('blocked-url') ? 'blocked' : 'fetch_failed' };
  }

  const head = checkImageResponse({
    ok: res.ok, contentType: res.headers.get('content-type'), contentLength: res.headers.get('content-length'),
  });
  if (!head.ok) { await res.body?.cancel().catch(() => {}); return head; }

  let buf: Awaited<ReturnType<typeof readCapped>>;
  try {
    buf = await readCapped(res.body);
  } catch {
    return { ok: false, reason: 'fetch_failed' };
  }
  if (buf === 'too_large') return { ok: false, reason: 'too_large' };
  if (!buf) return { ok: false, reason: 'fetch_failed' };

  const path = rehostPath(head.ext, deps.now?.());
  const bucket = storage.storage.from(BUCKET);
  const { error } = await bucket.upload(path, buf, { contentType: head.contentType, upsert: false });
  if (error) return { ok: false, reason: 'upload_failed' };
  return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl, unchanged: false };
}
