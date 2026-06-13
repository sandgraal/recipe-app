import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Admin-only / non-content routes shouldn't be crawled.
      disallow: ['/api/', '/en/import', '/es/import', '/en/recipes/new', '/es/recipes/new'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
