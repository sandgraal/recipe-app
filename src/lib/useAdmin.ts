'use client';

import { useState, useEffect } from 'react';
import { ADMIN_UI_COOKIE } from '@/lib/authConstants';
import { createLoginClient } from '@/lib/supabase';

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'credentials' | 'not_writer' | 'rate_limited' | 'unavailable' };

function reasonFromResponse(res: Response, code: unknown): Extract<LoginResult, { ok: false }>['reason'] {
  if (res.status === 429 || code === 'rate_limited') return 'rate_limited';
  if (res.status === 403 || code === 'not_writer') return 'not_writer';
  if (res.status === 401) return 'credentials';
  return 'unavailable';
}

/**
 * Admin auth is now server-managed via httpOnly cookies (see /api/auth/login).
 * The password is no longer in the client bundle. This hook reports admin state
 * from the non-secret hint cookie and drives login/logout through the API.
 */

function hasUiCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some(c => c.startsWith(`${ADMIN_UI_COOKIE}=1`));
}

/**
 * Kept for backwards-compatibility with existing write fetches. Auth now rides
 * on the httpOnly session cookie (sent automatically on same-origin requests),
 * so no Authorization header is needed from the browser.
 */
export function getAdminHeaders(): Record<string, string> {
  return {};
}

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIsAdmin(hasUiCookie());
    setLoaded(true);
  }, []);

  /** Fallback: the shared admin password. */
  async function login(password: string): Promise<LoginResult> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, reason: reasonFromResponse(res, body?.code) };
      }
      setIsAdmin(true);
      return { ok: true };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  /**
   * Finca account sign-in: Supabase Auth in the browser (no persisted session),
   * then the access token is exchanged server-side for the httpOnly admin
   * cookie. The local Supabase session is always dropped afterwards.
   */
  async function loginWithAccount(email: string, password: string): Promise<LoginResult> {
    let client;
    try {
      client = createLoginClient();
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) {
        // 400 = wrong credentials; 429 = throttled; 0/5xx = network or outage.
        const status = error?.status;
        if (status === 429) return { ok: false, reason: 'rate_limited' };
        if (status === 0 || (typeof status === 'number' && status >= 500)) return { ok: false, reason: 'unavailable' };
        return { ok: false, reason: 'credentials' };
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, reason: reasonFromResponse(res, body?.code) };
      }
      setIsAdmin(true);
      return { ok: true };
    } catch {
      return { ok: false, reason: 'unavailable' };
    } finally {
      // The httpOnly cookie is the session; leave no Supabase tokens behind.
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setIsAdmin(false);
  }

  return { isAdmin, loaded, login, loginWithAccount, logout };
}
