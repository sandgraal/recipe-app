'use client';

import { useState, useEffect } from 'react';

const ADMIN_KEY = 'colibri_admin_v1';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'A8ndr8k3!';

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
      try { localStorage.setItem(ADMIN_KEY, 'true'); } catch { /* ignore */ }
      setIsAdmin(true);
      return true;
    }
    return false;
  }

  function logout() {
    try { localStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ }
    setIsAdmin(false);
  }

  return { isAdmin, loaded, login, logout };
}
