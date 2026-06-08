'use client';

import { useState, useEffect } from 'react';

const ADMIN_KEY = 'colibri_admin_v1';
const ADMIN_TOKEN_KEY = 'colibri_admin_token_v1';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'A8ndr8k3!';

/**
 * Authorization headers for admin write requests (POST/PUT/DELETE).
 *
 * Returns `{ Authorization: 'Bearer <token>' }` when an admin is logged in,
 * or `{}` otherwise. The server (see src/lib/adminAuth.ts) only enforces this
 * once `ADMIN_PASSWORD` is configured; until then writes stay open and the
 * empty headers are harmless. Safe to spread into any fetch's headers.
 */
export function getAdminHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch { /* ignore */ }
  return {};
}

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setIsAdmin(localStorage.getItem(ADMIN_KEY) === 'true');
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  function login(user: string, pass: string): boolean {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      try {
        localStorage.setItem(ADMIN_KEY, 'true');
        localStorage.setItem(ADMIN_TOKEN_KEY, pass);
      } catch { /* ignore */ }
      setIsAdmin(true);
      return true;
    }
    return false;
  }

  function logout() {
    try {
      localStorage.removeItem(ADMIN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch { /* ignore */ }
    setIsAdmin(false);
  }

  return { isAdmin, loaded, login, logout };
}
