import { describe, it, expect } from 'vitest';
import { isPublicHttpUrl } from '@/lib/ssrf';

describe('isPublicHttpUrl (SSRF guard)', () => {
  it('allows public http(s) URLs', () => {
    expect(isPublicHttpUrl('https://www.allrecipes.com/recipe/123')).toBe(true);
    expect(isPublicHttpUrl('http://example.com')).toBe(true);
  });

  it('blocks localhost, metadata, and private/loopback/link-local IPs', () => {
    const blocked = [
      'http://localhost/x',
      'http://127.0.0.1',
      'https://0.0.0.0',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.5',
      'http://192.168.1.1',
      'http://172.16.0.1',
      'http://[::1]/',
    ];
    for (const u of blocked) expect(isPublicHttpUrl(u), u).toBe(false);
  });

  it('blocks non-http(s) protocols and garbage', () => {
    expect(isPublicHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isPublicHttpUrl('ftp://example.com')).toBe(false);
    expect(isPublicHttpUrl('not a url')).toBe(false);
  });
});
