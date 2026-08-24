import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipeCardsFiltered } from '@/lib/recipes';
import { categoryFromSlug, slugify } from '@/lib/browse';
import { RECIPE_CATEGORIES } from '@/lib/taxonomy';
import { t, localizeRecipeCategory, LOCALES, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import RecipeGrid from '@/components/RecipeGrid';

export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALES.flatMap(lang => RECIPE_CATEGORIES.map(c => ({ lang, category: slugify(c) })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; category: string }> },
): Promise<Metadata> {
  const { lang, category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) return {};
  const locale = lang as Locale;
  const name = localizeRecipeCategory(category, locale);
  const title = `${name} · ${SITE_NAME}`;
  return {
    title,
    alternates: {
      canonical: `${SITE_URL}/${lang}/category/${slug}`,
      languages: {
        en: `${SITE_URL}/en/category/${slug}`,
        es: `${SITE_URL}/es/category/${slug}`,
        'x-default': `${SITE_URL}/en/category/${slug}`,
      },
    },
    openGraph: { title, url: `${SITE_URL}/${lang}/category/${slug}`, type: 'website' },
  };
}

export default async function CategoryPage(
  { params }: { params: Promise<{ lang: string; category: string }> },
) {
  const { lang, category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();
  const locale = lang as Locale;

  const recipes = await getRecipeCardsFiltered({ category, sort: 'newest' });
  const name = localizeRecipeCategory(category, locale);
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
        <Link href={`/${lang}/browse?category=${encodeURIComponent(category)}`} className="text-sm font-medium" style={{ color: 'var(--secondary)' }}>
          {t(locale, 'browse_refine')} →
        </Link>
      </header>
      <RecipeGrid recipes={recipes} lang={lang} />
    </div>
  );
}
