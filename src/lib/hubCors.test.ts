import { describe, it, expect, afterEach } from 'vitest';
import { hubCorsHeaders, hubOrigins, DEFAULT_HUB_ORIGINS } from '@/lib/hubCors';

afterEach(() => { delete process.env.HUB_ORIGINS; });

describe('hubCors', () => {
  it('defaults to the hub origins in the contract', () => {
    expect(hubOrigins()).toEqual(DEFAULT_HUB_ORIGINS);
    expect(DEFAULT_HUB_ORIGINS).toContain('https://sandgraal.github.io');
  });

  it('echoes only the matching origin', () => {
    const h = hubCorsHeaders('https://sandgraal.github.io');
    expect(h['Access-Control-Allow-Origin']).toBe('https://sandgraal.github.io');
    expect(h['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(h['Access-Control-Allow-Headers']).toBe('Authorization, Content-Type');
    expect(h.Vary).toBe('Origin');
  });

  it('gives no CORS headers to other origins or to no origin', () => {
    for (const o of ['https://evil.example', 'http://sandgraal.github.io', null]) {
      const h = hubCorsHeaders(o);
      expect(h['Access-Control-Allow-Origin']).toBeUndefined();
      expect(h.Vary).toBe('Origin');
    }
  });

  it('reads HUB_ORIGINS at request time, trimmed, without trailing slashes', () => {
    process.env.HUB_ORIGINS = ' https://hub.example/ , https://other.example ';
    expect(hubOrigins()).toEqual(['https://hub.example', 'https://other.example']);
    expect(hubCorsHeaders('https://hub.example')['Access-Control-Allow-Origin']).toBe('https://hub.example');
    expect(hubCorsHeaders('https://sandgraal.github.io')['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
