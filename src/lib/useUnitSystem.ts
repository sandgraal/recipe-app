'use client';

import { useCallback } from 'react';
import type { UnitSystem } from './convert';
import { useStoredRaw, writeStored } from '@/lib/useStoredValue';

// Preferred measurement system for viewing a recipe — persisted per device.
const KEY = 'colibri:units';
const VALID: UnitSystem[] = ['original', 'metric', 'imperial'];

export function useUnitSystem(): [UnitSystem, (s: UnitSystem) => void] {
  const raw = useStoredRaw(KEY);
  const system: UnitSystem = raw && (VALID as string[]).includes(raw) ? (raw as UnitSystem) : 'original';
  const set = useCallback((s: UnitSystem) => writeStored(KEY, s), []);
  return [system, set];
}
