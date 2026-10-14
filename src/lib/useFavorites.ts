'use client';

import { useCallback, useMemo } from 'react';
import { readStored, useStoredRaw, writeStored } from '@/lib/useStoredValue';

// Favorites live in localStorage (no account) as an ordered list of recipe ids,
// most-recently-favorited first. The shared store keeps every mounted component
// (cards, detail, the home row) in sync, and the storage event syncs tabs.
const KEY = 'colibri:favorites';

function parse(raw: string | null): string[] {
  try {
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const raw = useStoredRaw(KEY);
  const ids = useMemo(() => parse(raw), [raw]);

  const toggle = useCallback((id: string) => {
    const cur = parse(readStored(KEY));
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [id, ...cur];
    writeStored(KEY, JSON.stringify(next));
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { favorites: ids, isFavorite, toggle };
}
