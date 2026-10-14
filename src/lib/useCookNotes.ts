'use client';

import { useCallback, useMemo } from 'react';
import { readStored, useStoredRaw, writeStored } from '@/lib/useStoredValue';

// Per-recipe cook notes in localStorage (no account): dated, most-recent first.
// The personal "I halved the sugar, 25 min not 30" scratchpad a personal
// cookbook earns over a public site. Stored per device.
export interface CookNote {
  id: string;
  text: string;
  at: string; // ISO timestamp
}

const keyFor = (recipeId: string) => `colibri:notes:${recipeId}`;

function parse(raw: string | null): CookNote[] {
  try {
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val)
      ? val.filter((n): n is CookNote => !!n && typeof n.text === 'string' && typeof n.id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function useCookNotes(recipeId: string) {
  const key = keyFor(recipeId);
  const raw = useStoredRaw(key);
  const notes = useMemo(() => parse(raw), [raw]);

  const add = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const prev = parse(readStored(key));
    writeStored(key, JSON.stringify([
      { id: `${Date.now()}-${prev.length}`, text: clean, at: new Date().toISOString() },
      ...prev,
    ]));
  }, [key]);

  const remove = useCallback((id: string) => {
    writeStored(key, JSON.stringify(parse(readStored(key)).filter(n => n.id !== id)));
  }, [key]);

  return { notes, add, remove };
}
