import type { MetadataRoute } from 'next';
import { getRecipeCards } from '@/lib/recipes';
import { SITE_URL } from '@/lib/site';
import { slugify } from '@/lib/browse';
import { landingOptions } from '@/lib/facets';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // One read; only categories and regions that have recipes are listed.
  const cards = await getRecipeCards();
  const ids = cards.map(c => c.id);
  const { categories, regions } = landingOptions(cards);
  const langs = ['en', 'es'] as const;
  const entries: MetadataRoute.Sitemap = [];
  for (const lang of langs) {
    entries.push({ url: `${SITE_URL}/${lang}`, changeFrequency: 'daily', priority: 1 });
    entries.push({ url: `${SITE_URL}/${lang}/browse`, changeFrequency: 'daily', priority: 0.8 });
    for (const c of categories) {
      entries.push({ url: `${SITE_URL}/${lang}/category/${slugify(c.value)}`, changeFrequency: 'weekly', priority: 0.6 });
    }
    for (const r of regions) {
      entries.push({ url: `${SITE_URL}/${lang}/region/${slugify(r.value)}`, changeFrequency: 'weekly', priority: 0.6 });
    }
    for (const id of ids) {
      entries.push({ url: `${SITE_URL}/${lang}/recipes/${id}`, changeFrequency: 'weekly', priority: 0.7 });
    }
  }
  return entries;
}
