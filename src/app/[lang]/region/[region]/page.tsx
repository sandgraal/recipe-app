import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipeCardsFiltered } from '@/lib/recipes';
import { regionFromSlug, slugify } from '@/lib/browse';
import { SUGGESTED_REGIONS } from '@/lib/taxonomy';
import { t, localizeRegion, LOCALES, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import RecipeGrid from '@/components/RecipeGrid';

export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALES.flatMap(lang => SUGGESTED_REGIONS.map(r => ({ lang, region: slugify(r) })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; region: string }> },
): Promise<Metadata> {
  const { lang, region: slug } = await params;
  const region = regionFromSlug(slug);
  if (!region) return {};
  const locale = lang as Locale;
  const name = localizeRegion(region, locale);
  const title = `${name} · ${SITE_NAME}`;
  return {
    title,
    alternates: {
      canonical: `${SITE_URL}/${lang}/region/${slug}`,
      languages: {
        en: `${SITE_URL}/en/region/${slug}`,
        es: `${SITE_URL}/es/region/${slug}`,
        'x-default': `${SITE_URL}/en/region/${slug}`,
      },
    },
    openGraph: { title, url: `${SITE_URL}/${lang}/region/${slug}`, type: 'website' },
  };
}

export default async function RegionPage(
  { params }: { params: Promise<{ lang: string; region: string }> },
) {
  const { lang, region: slug } = await params;
  const region = regionFromSlug(slug);
  if (!region) notFound();
  const locale = lang as Locale;

  const recipes = await getRecipeCardsFiltered({ region, sort: 'newest' });
  const name = localizeRegion(region, locale);
  const count = recipes.length;
  const countLabel = count === 1
    ? t(locale, 'browse_count_one', { n: count })
    : t(locale, 'browse_count_many', { n: count });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-end justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-3xl leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
            {name}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{countLabel}</p>
        </div>
        <Link href={`/${lang}/browse?region=${encodeURIComponent(region)}`} className="text-sm font-medium" style={{ color: 'var(--secondary)' }}>
          {t(locale, 'browse_refine')} →
        </Link>
      </header>
      {/* Group a region's recipes by category so the page reads as a menu. */}
      <RecipeGrid recipes={recipes} groupByCategory lang={lang} />
    </div>
  );
}
