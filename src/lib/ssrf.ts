/**
 * SSRF guard for server-side URL fetching (recipe imports).
 *
 * Only allows public http(s) URLs. Blocks localhost, cloud metadata
 * (169.254.169.254), and private/loopback/link-local IP literals. Known
 * residual: DNS rebinding (a public hostname resolving to an internal IP) is not
 * covered here — a fuller fix resolves DNS + pins the IP. Redirect hops are
 * re-validated by the caller (see import/url safeFetch).
 */
export function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  // URL.hostname keeps brackets for IPv6 literals ("[::1]") — strip them.
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return false;
  if (host === '169.254.169.254' || host.endsWith('.internal')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)) return false;
  }
  if (host.includes(':') && (host === '::1' || host.startsWith('fe80') || host.startsWith('fc') || host.startsWith('fd'))) {
    return false;
  }
  return true;
}
