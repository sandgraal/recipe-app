import type { Metadata } from 'next';
import Link from 'next/link';
import { getRecipeCardsFiltered } from '@/lib/recipes';
import { parseFilter, isFilterActive } from '@/lib/browse';
import { t, type Locale } from '@/lib/i18n';
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
  const all = await getRecipeCardsFiltered(filter);

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
        <FilterRail lang={lang} />

        <div>
          {visible.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <p className="text-base" style={{ color: 'var(--text)' }}>{t(locale, 'browse_none')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t(locale, 'browse_none_hint')}</p>
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
