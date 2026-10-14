import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';
import { isPublicHttpUrl } from '@/lib/ssrf';
import { safeFetch } from '@/lib/safeFetch';
import { rehostImage } from '@/lib/rehostImage';
import { getServiceSupabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { extractRecipe } from '@/lib/importRecipe';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, ...((init?.headers as Record<string, string>) || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function extractOgImage(rawHtml: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = rawHtml.match(p);
    if (m && m[1]?.startsWith('http')) return m[1];
  }
  return null;
}

function extractGalleryImages(rawHtml: string): string[] {
  const images = new Set<string>();

  // JSON-LD structured data (best source — Recipe schema images array)
  const jsonLdMatches = [...rawHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const nodes = item['@graph'] ? item['@graph'] : [item];
        for (const node of nodes) {
          if (node['@type'] === 'Recipe' || node.image) {
            const imgs = Array.isArray(node.image) ? node.image : node.image ? [node.image] : [];
            for (const img of imgs) {
              const url = typeof img === 'string' ? img : img?.url;
              if (typeof url === 'string' && url.startsWith('http')) images.add(url);
            }
          }
        }
      }
    } catch { /* skip malformed JSON-LD */ }
  }

  // og:image / twitter:image variants
  const metaMatches = [...rawHtml.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*>/gi)];
  for (const m of metaMatches) {
    const tag = m[0];
    const url = m[1];
    if (!url?.startsWith('http')) continue;
    if (/og:image|twitter:image/i.test(tag) && /\.(jpg|jpeg|png|webp)/i.test(url)) {
      images.add(url);
    }
  }

  // Large content images from srcset / data-src
  const srcsetMatches = [...rawHtml.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)];
  for (const m of srcsetMatches) {
    const parts = m[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    for (const url of parts) {
      if (url.startsWith('http') && /\.(jpg|jpeg|png|webp)/i.test(url) &&
          !/icon|logo|avatar|pixel|tracking|sprite/i.test(url)) {
        images.add(url);
      }
    }
  }

  return [...images].slice(0, 8);
}

export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await checkRateLimit(req, 'import-url', { limit: 10, windowMs: 60_000 });
  if (limited) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });
  const client = new Anthropic();
  let url: string | undefined;
  try {
    ({ url } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!url || typeof url !== 'string') return json({ error: 'URL required' }, { status: 400 });
  if (!isPublicHttpUrl(url)) return json({ error: 'That URL is not allowed' }, { status: 400 });

  let html = '';
  let ogImage: string | null = null;
  let galleryImages: string[] = [];

  try {
    const res = await safeFetch(url);
    const rawHtml = await res.text();
    ogImage = extractOgImage(rawHtml);
    galleryImages = extractGalleryImages(rawHtml);
    // Strip scripts/styles, keep text
    html = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000);
  } catch (err) {
    logger.warn('import/url: fetch failed', { url, err: String(err) });
    return json({ error: 'Failed to fetch URL' }, { status: 400 });
  }

  const result = await extractRecipe(client, 'import/url', `Extract the recipe from this webpage text. Use null for anything the page does not say. "order" counts the steps from 1.

Webpage text:
${html}`, 'Could not parse recipe');
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  const recipe = result.recipe;
  recipe.source_url = url;
  recipe.source_type = 'url';
  // Never keep a hotlink: copy the cover into our own storage, or save no image.
  // The page's cover is tried first, then up to two of its other pictures. (Those
  // other pictures are hotlinks, so they are not carried over as a gallery.)
  const candidates = [...new Set([ogImage, ...galleryImages].filter((u): u is string => !!u))].slice(0, 3);
  if (candidates.length > 0) {
    let storage: ReturnType<typeof getServiceSupabase> | null = null;
    try { storage = getServiceSupabase(); } catch (err) { logger.warn('import/url: storage unavailable', { err: String(err) }); }
    for (const candidate of storage ? candidates : []) {
      const hosted = await rehostImage(candidate, storage!);
      if (hosted.ok) { recipe.image_url = hosted.url; break; }
      logger.warn('import/url: image not re-hosted', { url, candidate, reason: hosted.reason });
    }
  }
  return json({ recipe });
}

// Haiku 5.5 thinks briefly before answering; a photo or page import can take longer than the default limit.
export const maxDuration = 60;
