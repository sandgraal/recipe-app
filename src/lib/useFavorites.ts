'use client';

import { useCallback, useEffect, useState } from 'react';

// Favorites live in localStorage (no account) as an ordered list of recipe ids,
// most-recently-favorited first. A custom event keeps every mounted component
// (cards, detail, the home row) in sync, and the storage event syncs tabs.
const KEY = 'colibri:favorites';
const EVENT = 'colibri:favorites-changed';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [id, ...cur];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVENT));
    setIds(next);
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { favorites: ids, isFavorite, toggle };
}
