import type { MetadataRoute } from 'next';
import { getAllRecipeIds } from '@/lib/recipes';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getAllRecipeIds();
  const langs = ['en', 'es'] as const;
  const entries: MetadataRoute.Sitemap = [];
  for (const lang of langs) {
    entries.push({ url: `${SITE_URL}/${lang}`, changeFrequency: 'daily', priority: 1 });
    for (const id of ids) {
      entries.push({ url: `${SITE_URL}/${lang}/recipes/${id}`, changeFrequency: 'weekly', priority: 0.7 });
    }
  }
  return entries;
}
