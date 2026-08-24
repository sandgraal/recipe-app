'use client';

import { useEffect } from 'react';

type Sentinel = {
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
};

/**
 * Keep the screen awake while `active` is true (e.g. Cook Mode at the stove).
 * The browser drops the lock when the tab is hidden, so we re-acquire on return —
 * but only when we don't already hold one, and we drop our reference on hide so
 * re-acquisition works predictably (no leaked/duplicate sentinels). No-op where
 * unsupported; best-effort, never throws.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const wl =
      typeof navigator !== 'undefined'
        ? (navigator as unknown as { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } }).wakeLock
        : undefined;
    if (!wl) return;

    let sentinel: Sentinel | null = null;
    let released = false;

    const request = () => {
      if (sentinel || released) return; // already held (or torn down) — don't stack
      wl.request('screen').then(s => {
        if (released) { s.release().catch(() => {}); return; }
        sentinel = s;
        // The browser auto-releases on hide; reflect that so we re-request on return.
        s.addEventListener?.('release', () => { sentinel = null; });
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
      else sentinel = null; // browser releases on hide — drop our stale reference
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
