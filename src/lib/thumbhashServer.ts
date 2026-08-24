import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import { isPublicHttpUrl } from '@/lib/ssrf';

/**
 * Fetch an image and compute a base64 ThumbHash (a ~20-30 byte blur placeholder).
 * Server-only (uses sharp). Best-effort: returns null on any failure — a bad or
 * slow image must never block or fail a recipe save.
 */
export async function computeThumbhashFromUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || !isPublicHttpUrl(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000); // keep writes snappy
    let buf: Buffer;
    try {
      // redirect: 'error' — isPublicHttpUrl only validates the initial URL, so
      // forbid redirects entirely rather than risk a public → internal hop.
      const res = await fetch(url, { signal: controller.signal, redirect: 'error' });
      if (!res.ok) return null;
      const len = Number(res.headers.get('content-length'));
      if (Number.isFinite(len) && len > 15_000_000) return null; // bail before downloading
      buf = Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(timer);
    }
    if (buf.byteLength > 15_000_000) return null; // fallback for chunked responses

    // ThumbHash needs RGBA pixels with each dimension ≤ 100.
    const { data, info } = await sharp(buf)
      .resize(100, 100, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = rgbaToThumbHash(info.width, info.height, new Uint8Array(data));
    return Buffer.from(hash).toString('base64');
  } catch {
    return null;
  }
}
