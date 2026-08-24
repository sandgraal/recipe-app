'use client';

import { useEffect, useState } from 'react';

// Recently-viewed recipes in localStorage (no account): most-recent first,
// deduped, capped. `recordRecentlyViewed` is called from the recipe detail page
// on mount; `useRecentlyViewed` reads the list reactively for the home row.
const KEY = 'colibri:recent';
const EVENT = 'colibri:recent-changed';
const MAX = 12;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(id: string) {
  try {
    const next = [id, ...read().filter(x => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function useRecentlyViewed(): string[] {
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
  return ids;
}
