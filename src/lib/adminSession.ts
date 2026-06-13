import { createHmac } from 'crypto';

/**
 * Opaque session value derived from the admin password via HMAC. Stored in the
 * cookie instead of the raw password, so the password isn't sent on every
 * request or captured by anything that logs Cookie headers. Possessing the token
 * still grants access (no server-side store), but it doesn't reveal the secret.
 *
 * Kept dependency-free (no next/server) so it's unit-testable in isolation.
 */
export function adminSessionToken(secret: string): string {
  return createHmac('sha256', secret).update('colibri-admin-session-v1').digest('hex');
}
