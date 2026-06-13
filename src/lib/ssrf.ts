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
    const parts = host.split('.').map(Number);
    if (parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)) return false;
  }
  if (host.includes(':')) {
    // IPv6 loopback/unspecified, link-local, and unique-local ranges.
    if (host === '::1' || host === '::' || host.startsWith('fe80') || host.startsWith('fc') || host.startsWith('fd')) return false;

    // Block IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1) if it resolves to a blocked IPv4 range.
    if (host.startsWith('::ffff:') || host.startsWith('0:0:0:0:0:ffff:')) {
      const tail = host.replace(/^0:0:0:0:0:ffff:|^::ffff:/, '');
      let ipv4: string | null = null;
      if (tail.includes('.')) {
        ipv4 = tail;
      } else {
        const parts = tail.split(':');
        if (parts.length === 2) {
          const hi = parseInt(parts[0], 16);
          const lo = parseInt(parts[1], 16);
          if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
            const n = (((hi << 16) | lo) >>> 0);
            ipv4 = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
          }
        }
      }
      if (ipv4 && !isPublicHttpUrl(`http://${ipv4}`)) return false;
    }
  }
  return true;
}
