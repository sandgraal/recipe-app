import type { Metadata } from 'next';
import Link from 'next/link';
import { getRecipeCards, getRecipeCardsFiltered } from '@/lib/recipes';
import { parseFilter, isFilterActive, sortRecipes } from '@/lib/browse';
import { computeFacets, filterRecipes, activeFilters, queryWithout, type ActiveFilter } from '@/lib/facets';
import {
  t, localizeRecipeCategory, localizeRegion, localizeCuisine, localizeTag, localizeDifficulty, localizeDietary,
  type Locale,
} from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';
import FilterRail from '@/components/FilterRail';
import RecipeGrid from '@/components/RecipeGrid';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

type SP = Promise<{ [key: string]: string | string[] | undefined }>;
const PAGE_SIZE = 60;

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SP },
): Promise<Metadata> {
  const { lang } = await params;
  const sp = await searchParams;
  const isEs = lang === 'es';
  const active = isFilterActive(parseFilter(sp));
  const title = isEs ? 'Explorar recetas · Creaciones Colibrí' : 'Browse recipes · Creaciones Colibrí';
  return {
    title,
    // Deep faceted combinations shouldn't be indexed — keep the crawl on the
    // clean landing pages. The bare /browse stays indexable.
    robots: active ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: `${SITE_URL}/${lang}/browse`,
      languages: { en: `${SITE_URL}/en/browse`, es: `${SITE_URL}/es/browse`, 'x-default': `${SITE_URL}/en/browse` },
    },
  };
}

function buildQuery(sp: Record<string, string | string[] | undefined>, overrides: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string' && v) p.set(k, v);
    else if (Array.isArray(v) && v[0]) p.set(k, v[0]);
  }
  for (const [k, v] of Object.entries(overrides)) p.set(k, v);
  return p.toString();
}

export default async function BrowsePage(
  { params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SP },
) {
  const { lang } = await params;
  const sp = await searchParams;
  const locale = lang as Locale;

  const filter = parseFilter(sp);
  // One read of the cards (or of the keyword matches when searching); the
  // filters and the facet counts are then computed in memory, so the options
  // always agree with the results and nothing extra is fetched.
  const pool = filter.q
    ? await getRecipeCardsFiltered({ q: filter.q, sort: 'relevance' })
    : await getRecipeCards();
  const all = sortRecipes(filterRecipes(pool, filter), filter.sort);
  const facets = computeFacets(pool, filter, {
    locale: lang,
    label: (facet, value) =>
      facet === 'category' ? localizeRecipeCategory(value, locale)
        : facet === 'region' ? localizeRegion(value, locale)
        : facet === 'diet' ? localizeDietary(value, locale)
        : value,
  });
  const active = activeFilters(filter);
  const activeName = (a: ActiveFilter): string => {
    switch (a.kind) {
      case 'category': return localizeRecipeCategory(a.value, locale);
      case 'region': return localizeRegion(a.value, locale);
      case 'cuisine': return localizeCuisine(a.value, locale);
      case 'tag': return localizeTag(a.value, locale);
      case 'difficulty': return localizeDifficulty(a.value, locale);
      case 'diet': return localizeDietary(a.value, locale);
      case 'max': return t(locale, 'facet_upto', { n: a.value });
      default: return `“${a.value}”`;
    }
  };
  const removeHref = (a: ActiveFilter) => {
    const qs = queryWithout(sp, { key: a.key, value: a.kind === 'diet' ? a.value : undefined });
    return `/${lang}/browse${qs ? `?${qs}` : ''}`;
  };

  const show = Math.max(PAGE_SIZE, Number(Array.isArray(sp.show) ? sp.show[0] : sp.show) || PAGE_SIZE);
  const visible = all.slice(0, show);
  const hasMore = all.length > show;
  const grouped = filter.sort === 'newest' && !filter.category && !filter.q;

  const count = all.length;
  const countLabel = count === 1
    ? t(locale, 'browse_count_one', { n: count })
    : t(locale, 'browse_count_many', { n: count });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
          {t(locale, 'browse_title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }} role="status" aria-live="polite">{countLabel}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        <FilterRail lang={lang} facets={facets} />

        <div>
          {active.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-6" aria-label={t(locale, 'browse_active_filters')}>
              {active.map(a => (
                <li key={`${a.key}:${a.value}`}>
                  <Link
                    href={removeHref(a)}
                    scroll={false}
                    className="chip inline-flex items-center gap-1"
                    aria-label={t(locale, 'browse_remove_filter', { name: activeName(a) })}
                  >
                    {activeName(a)} <span aria-hidden="true">×</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {visible.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <p className="text-base" style={{ color: 'var(--text)' }}>{t(locale, 'browse_none')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t(locale, 'browse_none_hint')}</p>
              {active.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {active.map(a => (
                    <Link
                      key={`${a.key}:${a.value}`}
                      href={removeHref(a)}
                      scroll={false}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border"
                      style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)', background: 'var(--card)' }}
                    >
                      {t(locale, 'browse_remove_filter', { name: activeName(a) })}
                    </Link>
                  ))}
                  {active.length > 1 && (
                    <Link
                      href={`/${lang}/browse`}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {t(locale, 'browse_remove_all')}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <RecipeGrid recipes={visible} groupByCategory={grouped} lang={lang} />
              {hasMore && (
                <div className="mt-8 text-center">
                  <Link
                    href={`?${buildQuery(sp, { show: String(show + PAGE_SIZE) })}`}
                    scroll={false}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)', background: 'var(--card)' }}
                  >
                    {t(locale, 'browse_loadmore')} ↓
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
