/** Canonical site origin, used for CORS, metadata, sitemap, and JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://recipe-app-blush-eta.vercel.app').replace(/\/$/, '');

export const SITE_NAME = 'Creaciones Colibrí';
