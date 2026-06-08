import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeAllowed } from '@/lib/adminAuth';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  const client = new Anthropic();
  const { url } = await req.json();
  if (!url) return json({ error: 'URL required' }, { status: 400 });

  let html = '';
  let ogImage: string | null = null;
  let galleryImages: string[] = [];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
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
  } catch {
    return json({ error: 'Failed to fetch URL' }, { status: 400 });
  }

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Extract the recipe from this webpage text and return ONLY a JSON object with these exact fields (no markdown, no explanation):
{
  "title": string,
  "description": string or null,
  "servings": number or null,
  "total_time": string or null,
  "cuisine": string or null,
  "tags": string[],
  "ingredients": [{"amount": string, "unit": string, "item": string, "notes": string or null}],
  "steps": [{"order": number, "text": string}],
  "notes": string or null
}

Webpage text:
${html}`,
    }],
  });

  const text = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return json({ error: 'Could not parse recipe' }, { status: 422 });

  try {
    const recipe = JSON.parse(jsonMatch[0]);
    recipe.source_url = url;
    recipe.source_type = 'url';
    recipe.tags = recipe.tags || [];
    recipe.ingredients = recipe.ingredients || [];
    recipe.steps = recipe.steps || [];
    if (ogImage) recipe.image_url = ogImage;
    if (galleryImages.length > 0) recipe.gallery_images = galleryImages;
    return json({ recipe });
  } catch {
    return json({ error: 'Invalid recipe JSON' }, { status: 422 });
  }
}
