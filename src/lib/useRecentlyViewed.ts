'use client';

import { useMemo } from 'react';
import { readStored, useStoredRaw, writeStored } from '@/lib/useStoredValue';

// Recently-viewed recipes in localStorage (no account): most-recent first,
// deduped, capped. `recordRecentlyViewed` is called from the recipe detail page
// on mount; `useRecentlyViewed` reads the list reactively for the home row.
const KEY = 'colibri:recent';
const MAX = 12;

function parse(raw: string | null): string[] {
  try {
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(id: string) {
  const next = [id, ...parse(readStored(KEY)).filter(x => x !== id)].slice(0, MAX);
  writeStored(KEY, JSON.stringify(next));
}

export function useRecentlyViewed(): string[] {
  const raw = useStoredRaw(KEY);
  return useMemo(() => parse(raw), [raw]);
}
