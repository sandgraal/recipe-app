import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/site';

// Web App Manifest → makes the site installable (Add to Home Screen) with a
// branded icon, standalone display, and splash colors. Next serves this at
// /manifest.webmanifest and injects <link rel="manifest"> automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Colibrí',
    short_name: 'Colibrí',
    description:
      'Costa Rican home cooking — a bilingual recipe collection with step timers, cook mode, and a kitchen-friendly print view.',
    // start_url is locale-neutral; middleware redirects "/" to the user's locale.
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf8f3',
    theme_color: '#fdf8f3',
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Separate maskable icon (wider crop) so Android's circular/squircle mask
      // never clips the hummingbird.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
