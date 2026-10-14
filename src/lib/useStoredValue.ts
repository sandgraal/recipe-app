'use client';

import { useSyncExternalStore } from 'react';

/**
 * Small external-store helpers for values that live outside React (localStorage,
 * a cookie). `useSyncExternalStore` renders the server/hydration value first and
 * the real value right after, with no setState-in-effect and no hydration
 * mismatch. Every write goes through `writeStored` / `notifyStoredChange` so all
 * mounted readers (and other tabs, via the `storage` event) stay in sync.
 */
const EVENT = 'colibri:local-changed';

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Tell every mounted reader that something stored changed (also used after cookie changes). */
export function notifyStoredChange() {
  window.dispatchEvent(new Event(EVENT));
}

export function readStored(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Write (or, with null, remove) a localStorage value and notify readers. Storage failures are ignored. */
export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable: private mode or full */ }
  notifyStoredChange();
}

/** The raw localStorage string for `key` (null on the server, before hydration, or when unset). */
export function useStoredRaw(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readStored(key), () => null);
}

/** Subscribe to arbitrary client-only state (e.g. a cookie) and read it with `getSnapshot`. */
export function useClientSnapshot<T>(getSnapshot: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
