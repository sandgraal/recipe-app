'use client';

import { useState, useEffect } from 'react';
import { ADMIN_UI_COOKIE } from '@/lib/authConstants';

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

  async function login(password: string): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) return false;
      setIsAdmin(true);
      return true;
    } catch {
      return false;
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setIsAdmin(false);
  }

  return { isAdmin, loaded, login, logout };
}
