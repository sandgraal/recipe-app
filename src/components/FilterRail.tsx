'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { FacetSet } from '@/lib/facets';
import { SORT_KEYS, DEFAULT_SORT, type SortKey } from '@/lib/browse';
import {
  t, localizeRecipeCategory, localizeRegion, localizeDifficulty, localizeDietary, type Locale,
} from '@/lib/i18n';

/**
 * URL-driven facet controls. Every change rewrites the query string on the
 * current path (so /browse stays shareable and bookmarkable) and resets paging.
 * Single-select for category/region/difficulty/max-time, multi-select for diet.
 * Options come from the recipes that exist (see lib/facets.ts): nothing with
 * zero recipes is offered, and each chip shows how many recipes it would give.
 * Chips use the token-driven `.chip` primitive; active state is expressed with
 * aria-pressed and styled entirely in CSS.
 */
export default function FilterRail({ lang, facets }: { lang: string; facets: FacetSet }) {
  const locale = lang as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function commit(next: URLSearchParams) {
    next.delete('show');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  function toggleSingle(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    commit(next);
  }
  function toggleDiet(flag: string) {
    const cur = (params.get('diet') ?? '').split(',').filter(Boolean);
    const list = cur.includes(flag) ? cur.filter(f => f !== flag) : [...cur, flag];
    const next = new URLSearchParams(params.toString());
    if (list.length) next.set('diet', list.join(','));
    else next.delete('diet');
    commit(next);
  }
  function setSort(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === DEFAULT_SORT) next.delete('sort');
    else next.set('sort', value);
    commit(next);
  }

  const activeDiet = (params.get('diet') ?? '').split(',').filter(Boolean);
  const hasAny = ['category', 'region', 'cuisine', 'tag', 'diet', 'difficulty', 'max', 'q'].some(k => params.get(k));
  // Validate against the known sort keys so an invalid ?sort= doesn't leave the
  // <select> blank / out of sync with the default parseFilter() applies.
  const sortParam = params.get('sort') ?? '';
  const currentSort: SortKey = (SORT_KEYS as readonly string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : DEFAULT_SORT;

  return (
    <aside className="md:sticky md:top-20 space-y-6" aria-label={t(locale, 'browse_filters')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {t(locale, 'browse_filters')}
        </h2>
        {hasAny && (
          <button onClick={() => router.push(pathname, { scroll: false })} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {t(locale, 'browse_clear')}
          </button>
        )}
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>
          {t(locale, 'browse_sort')}
        </label>
        <select
          value={currentSort}
          onChange={e => setSort(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}
        >
          {SORT_KEYS.map(k => (
            <option key={k} value={k}>{t(locale, `sort_${k}` as never)}</option>
          ))}
        </select>
      </div>

      <FacetGroup label={t(locale, 'facet_category')} show={facets.category.length > 0}>
        {facets.category.map(o => (
          <FacetChip key={o.value} active={params.get('category') === o.value} count={o.count} onClick={() => toggleSingle('category', o.value)}>
            {localizeRecipeCategory(o.value, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_region')} show={facets.region.length > 0}>
        {facets.region.map(o => (
          <FacetChip key={o.value} active={o.active} count={o.count} onClick={() => toggleSingle('region', o.active ? (params.get('region') ?? o.value) : o.value)}>
            {localizeRegion(o.value, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_dietary')} show={facets.diet.length > 0}>
        {facets.diet.map(o => (
          <FacetChip key={o.value} active={activeDiet.includes(o.value)} count={o.count} onClick={() => toggleDiet(o.value)}>
            {localizeDietary(o.value, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_difficulty')} show={facets.difficulty.length > 0}>
        {facets.difficulty.map(o => (
          <FacetChip key={o.value} active={params.get('difficulty') === o.value} count={o.count} onClick={() => toggleSingle('difficulty', o.value)}>
            {localizeDifficulty(o.value, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_maxtime')} show={facets.maxTime.length > 0}>
        {facets.maxTime.map(o => (
          <FacetChip key={o.value} active={params.get('max') === o.value} count={o.count} onClick={() => toggleSingle('max', o.value)}>
            {t(locale, 'facet_upto', { n: o.value })}
          </FacetChip>
        ))}
      </FacetGroup>
    </aside>
  );
}

function FacetGroup({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FacetChip({
  children, active, count, onClick,
}: { children: React.ReactNode; active: boolean; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="chip">
      {children} <span className="opacity-70">({count})</span>
    </button>
  );
}
