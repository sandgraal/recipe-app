import type { Metadata } from 'next';
import { getRecipeCardsFiltered } from '@/lib/recipes';
import { t, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import SearchBox from '@/components/SearchBox';
import RecipeGrid from '@/components/RecipeGrid';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const { lang } = await params;
  const isEs = lang === 'es';
  return {
    title: `${isEs ? 'Buscar recetas' : 'Search recipes'} · ${SITE_NAME}`,
    // Search result pages shouldn't be indexed.
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}/${lang}/search` },
  };
}

export default async function SearchPage(
  { params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SP },
) {
  const { lang } = await params;
  const sp = await searchParams;
  const locale = lang as Locale;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || '';

  const recipes = q ? await getRecipeCardsFiltered({ q, sort: 'newest' }) : [];
  const count = recipes.length;
  const countLabel = count === 1
    ? t(locale, 'browse_count_one', { n: count })
    : t(locale, 'browse_count_many', { n: count });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl leading-tight mb-5" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
        {t(locale, 'search_page_title')}
      </h1>

      <SearchBox lang={lang} initial={q} />

      <div className="mt-8">
        {!q ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{t(locale, 'search_page_prompt')}</p>
        ) : count === 0 ? (
          <p className="text-base" style={{ color: 'var(--text)' }}>
            {t(locale, 'search_page_none')} <strong>&ldquo;{q}&rdquo;</strong>
          </p>
        ) : (
          <>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>{countLabel}</p>
            <RecipeGrid recipes={recipes} lang={lang} />
          </>
        )}
      </div>
    </div>
  );
}
