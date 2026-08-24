import { thumbHashToDataURL } from 'thumbhash';

/**
 * Decode a stored base64 ThumbHash into a data URL usable as next/image's
 * `blurDataURL`. Isomorphic (client + server); returns undefined on bad/empty
 * input so callers can skip the placeholder.
 */
export function thumbhashToDataUrl(base64: string | null | undefined): string | undefined {
  if (!base64) return undefined;
  try {
    const binary =
      typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return thumbHashToDataURL(bytes);
  } catch {
    return undefined;
  }
}
