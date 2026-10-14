import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipeCards } from '@/lib/recipes';
import { regionFromSlug, slugify } from '@/lib/browse';
import { filterRecipes, landingOptions, findBySlug } from '@/lib/facets';
import { t, localizeRegion, localizeRecipeCategory, LOCALES, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import RecipeGrid from '@/components/RecipeGrid';
import EmptyLanding from '@/components/EmptyLanding';

// Region is free text: a slug resolves against the regions in the data first,
// then the seed list (so a known-but-empty region still gets a friendly page).
function resolveRegion(slug: string, inData: ReturnType<typeof landingOptions>['regions']): { name: string; empty: boolean } | null {
  const hit = findBySlug(inData, slug);
  if (hit) return { name: hit.value, empty: false };
  const seed = regionFromSlug(slug);
  return seed ? { name: seed, empty: true } : null;
}

export const revalidate = 3600;

// Only regions that have recipes are built ahead of time.
export async function generateStaticParams() {
  const { regions } = landingOptions(await getRecipeCards());
  return LOCALES.flatMap(lang => regions.map(r => ({ lang, region: slugify(r.value) })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; region: string }> },
): Promise<Metadata> {
  const { lang, region: slug } = await params;
  const resolved = resolveRegion(slug, landingOptions(await getRecipeCards()).regions);
  if (!resolved) return {};
  const locale = lang as Locale;
  const name = localizeRegion(resolved.name, locale);
  const title = `${name} · ${SITE_NAME}`;
  return {
    title,
    robots: resolved.empty ? { index: false, follow: true } : undefined,
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
  const all = await getRecipeCards();
  const landing = landingOptions(all, { locale: lang });
  const resolved = resolveRegion(slug, landing.regions);
  if (!resolved) notFound();
  const locale = lang as Locale;
  const region = resolved.name;

  const recipes = filterRecipes(all, { region });
  const name = localizeRegion(region, locale);
  if (recipes.length === 0) {
    return (
      <EmptyLanding
        lang={lang}
        title={t(locale, 'empty_region_title', { name })}
        related={[
          ...landing.regions.map(r => ({ href: `/${lang}/region/${slugify(r.value)}`, label: localizeRegion(r.value, locale), count: r.count })),
          ...landing.categories.slice(0, 4).map(c => ({ href: `/${lang}/category/${slugify(c.value)}`, label: localizeRecipeCategory(c.value, locale), count: c.count })),
        ]}
      />
    );
  }
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
