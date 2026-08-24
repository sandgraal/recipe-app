'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  RECIPE_CATEGORIES, DIFFICULTIES, DIETARY_FLAGS, SUGGESTED_REGIONS,
} from '@/lib/taxonomy';
import { MAX_TIME_OPTIONS, SORT_KEYS, DEFAULT_SORT, type SortKey } from '@/lib/browse';
import {
  t, localizeRecipeCategory, localizeRegion, localizeDifficulty, localizeDietary, type Locale,
} from '@/lib/i18n';

/**
 * URL-driven facet controls. Every change rewrites the query string on the
 * current path (so /browse stays shareable and bookmarkable) and resets paging.
 * Single-select for category/region/difficulty/max-time, multi-select for diet.
 */
export default function FilterRail({ lang }: { lang: string }) {
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
  function clearAll() {
    router.push(pathname, { scroll: false });
  }

  const activeDiet = (params.get('diet') ?? '').split(',').filter(Boolean);
  const hasAny = ['category', 'region', 'cuisine', 'tag', 'diet', 'difficulty', 'max', 'q'].some(k => params.get(k));
  // Validate against the known sort keys so an invalid ?sort= doesn't leave the
  // <select> blank / out of sync with the default parseFilter() applies.
  const sortParam = params.get('sort') ?? '';
  const currentSort: SortKey = (SORT_KEYS as readonly string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : DEFAULT_SORT;

  const chip = (active: boolean): React.CSSProperties =>
    active
      ? { background: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' }
      : { background: 'var(--card)', color: 'var(--muted)', borderColor: 'var(--border)' };

  return (
    <aside className="md:sticky md:top-20 space-y-6" aria-label={t(locale, 'browse_filters')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {t(locale, 'browse_filters')}
        </h2>
        {hasAny && (
          <button onClick={clearAll} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
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

      <FacetGroup label={t(locale, 'facet_category')}>
        {RECIPE_CATEGORIES.map(c => (
          <FacetChip key={c} style={chip(params.get('category') === c)} onClick={() => toggleSingle('category', c)}>
            {localizeRecipeCategory(c, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_region')}>
        {SUGGESTED_REGIONS.map(r => (
          <FacetChip key={r} style={chip(params.get('region') === r)} onClick={() => toggleSingle('region', r)}>
            {localizeRegion(r, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_dietary')}>
        {DIETARY_FLAGS.map(d => (
          <FacetChip key={d} style={chip(activeDiet.includes(d))} onClick={() => toggleDiet(d)}>
            {localizeDietary(d, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_difficulty')}>
        {DIFFICULTIES.map(d => (
          <FacetChip key={d} style={chip(params.get('difficulty') === d)} onClick={() => toggleSingle('difficulty', d)}>
            {localizeDifficulty(d, locale)}
          </FacetChip>
        ))}
      </FacetGroup>

      <FacetGroup label={t(locale, 'facet_maxtime')}>
        {MAX_TIME_OPTIONS.map(m => (
          <FacetChip key={m} style={chip(params.get('max') === String(m))} onClick={() => toggleSingle('max', String(m))}>
            {t(locale, 'facet_upto', { n: m })}
          </FacetChip>
        ))}
      </FacetGroup>
    </aside>
  );
}

function FacetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FacetChip({
  children, style, onClick,
}: { children: React.ReactNode; style: React.CSSProperties; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={style.background === 'var(--secondary)'}
      className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
      style={style}
    >
      {children}
    </button>
  );
}
