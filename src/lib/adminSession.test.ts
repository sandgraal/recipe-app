import { describe, it, expect } from 'vitest';
import { adminSessionToken } from '@/lib/adminSession';

describe('adminSessionToken', () => {
  it('is deterministic for a given secret', () => {
    expect(adminSessionToken('s3cr3t!')).toBe(adminSessionToken('s3cr3t!'));
  });

  it('does not reveal the raw secret and differs per secret', () => {
    const token = adminSessionToken('s3cr3t!');
    expect(token).not.toBe('s3cr3t!');
    expect(token).not.toBe(adminSessionToken('different'));
    expect(token).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });
});
