'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UnitSystem } from './convert';

// Preferred measurement system for viewing a recipe — persisted per device.
const KEY = 'colibri:units';
const VALID: UnitSystem[] = ['original', 'metric', 'imperial'];

function read(): UnitSystem {
  try {
    const v = localStorage.getItem(KEY);
    return v && (VALID as string[]).includes(v) ? (v as UnitSystem) : 'original';
  } catch {
    return 'original';
  }
}

export function useUnitSystem(): [UnitSystem, (s: UnitSystem) => void] {
  const [system, setSystem] = useState<UnitSystem>('original');
  useEffect(() => { setSystem(read()); }, []);
  const set = useCallback((s: UnitSystem) => {
    try { localStorage.setItem(KEY, s); } catch { /* ignore */ }
    setSystem(s);
  }, []);
  return [system, set];
}
