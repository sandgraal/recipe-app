'use client';

import { useEffect } from 'react';

/**
 * Keep the screen awake while `active` is true (e.g. Cook Mode at the stove).
 * Re-acquires the lock when the tab returns to the foreground (the browser drops
 * it on tab switch), and releases on cleanup. No-op where the API is
 * unsupported — best-effort, never throws.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const wl =
      typeof navigator !== 'undefined'
        ? (navigator as unknown as {
            wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
          }).wakeLock
        : undefined;
    if (!wl) return;

    let sentinel: { release: () => Promise<void> } | null = null;
    let released = false;

    const request = () =>
      wl.request('screen').then(s => { sentinel = s; }).catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
