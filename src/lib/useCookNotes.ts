'use client';

import { useCallback, useEffect, useState } from 'react';

// Per-recipe cook notes in localStorage (no account): dated, most-recent first.
// The personal "I halved the sugar, 25 min not 30" scratchpad a personal
// cookbook earns over a public site. Stored per device.
export interface CookNote {
  id: string;
  text: string;
  at: string; // ISO timestamp
}

const keyFor = (recipeId: string) => `colibri:notes:${recipeId}`;

function read(recipeId: string): CookNote[] {
  try {
    const raw = localStorage.getItem(keyFor(recipeId));
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val)
      ? val.filter((n): n is CookNote => !!n && typeof n.text === 'string' && typeof n.id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function useCookNotes(recipeId: string) {
  const [notes, setNotes] = useState<CookNote[]>([]);

  useEffect(() => { setNotes(read(recipeId)); }, [recipeId]);

  const persist = (next: CookNote[]) => {
    try { localStorage.setItem(keyFor(recipeId), JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  };

  const add = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setNotes(prev => persist([
      { id: `${Date.now()}-${prev.length}`, text: clean, at: new Date().toISOString() },
      ...prev,
    ]));
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback((id: string) => {
    setNotes(prev => persist(prev.filter(n => n.id !== id)));
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { notes, add, remove };
}
