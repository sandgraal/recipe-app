import { describe, it, expect } from 'vitest';
import { readJsonBody } from '@/lib/requestBody';

const post = (body: string) => new Request('http://test/api', { method: 'POST', body });

describe('readJsonBody', () => {
  it('parses valid JSON', async () => {
    const r = await readJsonBody(post('{"title":"x"}'));
    expect(r).toEqual({ ok: true, data: { title: 'x' } });
  });

  it('rejects invalid JSON with 400', async () => {
    const r = await readJsonBody(post('{not json'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it('rejects an empty body', async () => {
    const r = await readJsonBody(post(''));
    expect(r.ok).toBe(false);
  });

  it('rejects an oversized body with 413 (by actual bytes, not Content-Length)', async () => {
    const big = `{"x":"${'a'.repeat(2_000_000)}"}`;
    const r = await readJsonBody(post(big), 1_000_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
  });
});
