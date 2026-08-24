import type { MetadataRoute } from 'next';
import { getAllRecipeIds } from '@/lib/recipes';
import { SITE_URL } from '@/lib/site';
import { RECIPE_CATEGORIES, SUGGESTED_REGIONS } from '@/lib/taxonomy';
import { slugify } from '@/lib/browse';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getAllRecipeIds();
  const langs = ['en', 'es'] as const;
  const entries: MetadataRoute.Sitemap = [];
  for (const lang of langs) {
    entries.push({ url: `${SITE_URL}/${lang}`, changeFrequency: 'daily', priority: 1 });
    entries.push({ url: `${SITE_URL}/${lang}/browse`, changeFrequency: 'daily', priority: 0.8 });
    for (const c of RECIPE_CATEGORIES) {
      entries.push({ url: `${SITE_URL}/${lang}/category/${slugify(c)}`, changeFrequency: 'weekly', priority: 0.6 });
    }
    for (const r of SUGGESTED_REGIONS) {
      entries.push({ url: `${SITE_URL}/${lang}/region/${slugify(r)}`, changeFrequency: 'weekly', priority: 0.6 });
    }
    for (const id of ids) {
      entries.push({ url: `${SITE_URL}/${lang}/recipes/${id}`, changeFrequency: 'weekly', priority: 0.7 });
    }
  }
  return entries;
}
