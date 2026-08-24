/* Creaciones Colibrí — offline service worker (hand-authored; no build step).
 *
 * Strategy for a read-mostly, ISR cookbook used at the stove:
 *  - Navigations (recipe/browse pages): network-first, fall back to the cached
 *    page, then an offline page. So a recipe you've opened before works offline.
 *  - Images (Next image optimizer + Supabase storage): cache-first.
 *  - Static build assets + fonts: stale-while-revalidate.
 * Bump VERSION to invalidate old caches on deploy. */
const VERSION = 'v1';
const PRECACHE = `colibri-precache-${VERSION}`;
const RUNTIME = `colibri-runtime-${VERSION}`;
const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((c) => c.addAll(PRECACHE_URLS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isImage(req, url) {
  return (
    req.destination === 'image' ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/storage/v1/object')
  );
}
function isStatic(url) {
  return url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/fonts');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigations: network-first → cached page → offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/offline.html')))
    );
    return;
  }

  // Images (incl. cross-origin Supabase): cache-first, tolerate opaque.
  if (isImage(req, url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Static build assets + fonts: stale-while-revalidate.
  if (sameOrigin && isStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else: default network behavior.
});
