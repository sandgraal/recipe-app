'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import RecipeCard from '@/components/RecipeCard';
import { Recipe } from '@/lib/types';
import { t, getGreeting, localizeCuisine, localizeTag, type Locale } from '@/lib/i18n';
import { Search, X } from 'lucide-react';
import { useAdmin } from '@/lib/useAdmin';

function parseMinutes(time: string): number {
  const h = time.match(/(\d+)\s*h/i);
  const m = time.match(/(\d+)\s*m/i);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

// ── Horizontal scroll section ─────────────────────────────────────────────────

function RecipeRow({ title, recipes, viewAllLabel, onViewAll }: {
  title: string;
  recipes: Recipe[];
  viewAllLabel?: string;
  onViewAll?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll, { passive: true });
    return () => el?.removeEventListener('scroll', checkScroll);
  }, [checkScroll, recipes]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' });
  };

  if (recipes.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Decorative scroll aids — keyboard users tab through the card links directly. */}
          <button onClick={() => scroll('left')} aria-hidden="true" tabIndex={-1}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border transition-opacity"
            style={{ borderColor: 'var(--border)', background: 'var(--card)', opacity: canScrollLeft ? 1 : 0.25, cursor: canScrollLeft ? 'pointer' : 'default' }}>
            ←
          </button>
          <button onClick={() => scroll('right')} aria-hidden="true" tabIndex={-1}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border transition-opacity"
            style={{ borderColor: 'var(--border)', background: 'var(--card)', opacity: canScrollRight ? 1 : 0.25, cursor: canScrollRight ? 'pointer' : 'default' }}>
            →
          </button>
          {onViewAll && (
            <button onClick={onViewAll} className="text-xs font-medium transition-colors"
              style={{ color: 'var(--secondary)' }}>
              {viewAllLabel || 'See all'} →
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {recipes.map(r => (
          <div key={r.id} style={{ scrollSnapAlign: 'start' }}>
            <RecipeCard recipe={r} size="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Search overlay ────────────────────────────────────────────────────────────

function SearchOverlay({
  lang, search, setSearch, cuisine, setCuisine, activeTag, setActiveTag,
  cuisines, allTags, onClose, resultCount,
}: {
  lang: Locale;
  search: string; setSearch: (v: string) => void;
  cuisine: string; setCuisine: (v: string) => void;
  activeTag: string; setActiveTag: (v: string) => void;
  cuisines: string[]; allTags: string[];
  onClose: () => void; resultCount: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      role="dialog" aria-modal="true" aria-label={t(lang, 'home_search')}
      style={{ background: 'rgba(47,43,40,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-20 mx-auto w-full max-w-2xl px-4">
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--card)' }}>
          <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <Search size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder={t(lang, 'search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-base outline-none bg-transparent"
              style={{ color: 'var(--text)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--muted)' }}>
                {t(lang, 'search_clear')}
              </button>
            )}
            <button onClick={onClose} aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'var(--border)', color: 'var(--muted)' }}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            {cuisines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCuisine('')}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={!cuisine
                    ? { background: 'var(--secondary)', color: 'white' }
                    : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  {t(lang, 'search_all_cuisines')}
                </button>
                {cuisines.map(c => (
                  <button key={c} onClick={() => setCuisine(cuisine === c ? '' : c)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={cuisine === c
                      ? { background: 'var(--secondary)', color: 'white' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    {localizeCuisine(c, lang)}
                  </button>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 15).map(tag => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                    className="px-3 py-1 rounded-full text-xs transition-all"
                    style={activeTag === tag
                      ? { background: 'var(--accent)', color: 'white' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    {localizeTag(tag, lang)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(search || cuisine || activeTag) && (
            <div className="px-4 pb-3">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {resultCount === 1
                  ? t(lang, 'search_found_one', { n: resultCount })
                  : t(lang, 'search_found_many', { n: resultCount })}
                {search && <> {t(lang, 'search_matching')} <strong style={{ color: 'var(--text)' }}>&ldquo;{search}&rdquo;</strong></>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomeClient({ recipes: initialRecipes, lang }: { recipes: Recipe[]; lang: string }) {
  const locale = lang as Locale;

  // Server-fetched catalog (props) — rendered into the initial HTML, no client
  // fetch on load. `recipes` holds the (optionally filtered) view.
  const allRecipes = initialRecipes;
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const { isAdmin } = useAdmin();

  const isFiltering = !!(search || cuisine || activeTag);

  // Browseable cuisine + tag lists, derived from the catalog. Drop the app-wide
  // "Costa Rican" tag (it's on nearly everything) and one-off noise (count < 2).
  const { cuisines, allTags } = useMemo(() => {
    const uniqueCuisines = [...new Set(allRecipes.map(r => r.cuisine).filter((c): c is string => !!c))]
      .filter(c => c.trim().toLowerCase() !== 'costa rican') as string[];
    const tagCount = new Map<string, number>();
    allRecipes.forEach(r => (r.tags || []).forEach(tg => {
      if (tg) tagCount.set(tg, (tagCount.get(tg) || 0) + 1);
    }));
    const uniqueTags = [...tagCount.entries()]
      .filter(([tg, n]) => tg.trim().toLowerCase() !== 'costa rican' && n >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([tg]) => tg);
    return { cuisines: uniqueCuisines, allTags: uniqueTags.slice(0, 18) };
  }, [allRecipes]);

  useEffect(() => {
    if (!isFiltering) { setRecipes(allRecipes); return; }
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (cuisine) params.set('cuisine', cuisine);
    if (activeTag) params.set('tag', activeTag);
    fetch(`/api/recipes?${params}`)
      .then(r => r.json())
      .then(d => setRecipes(d.recipes || []));
  }, [search, cuisine, activeTag, isFiltering, allRecipes]);

  useEffect(() => {
    if (!isFiltering) setShowGrid(false);
  }, [isFiltering]);

  // Only recipes with a photo are eligible for the curated first-load sections
  // (hero + rows). Photoless recipes stay fully reachable via search and the
  // "view all" grids — they just aren't featured with an empty placeholder.
const featurable = allRecipes.filter(r => !!r.image_url?.trim());

  const recent = featurable.slice(0, 20);
  const hero = recent[0];
  const heroSecondary = recent.slice(1, 3);

  const quickMeals = featurable.filter(r => {
    if (!r.total_time) return false;
    const mins = parseMinutes(r.total_time);
    return mins > 0 && mins <= 30;
  }).slice(0, 12);

  // Regional rows: any meaningful sub-cuisine with enough recipes (in practice
  // the "Costa Rican (Chinese)" and "Costa Rican (Caribbean)" variants). The
  // generic "Costa Rican" cuisine is already excluded upstream — a row of it
  // would just duplicate the full list.
  const cuisineGroups = cuisines
    .filter(c => c.trim().toLowerCase() !== 'costa rican')
    .map(c => ({ cuisine: c, recipes: featurable.filter(r => r.cuisine === c) }))
    .filter(g => g.recipes.length >= 3)
    .slice(0, 3);

  // Food-type rows: the most popular meaningful tags, by count. Exclude any tag
  // already represented by a rendered cuisine row — matched by substring so the
  // "Caribbean"/"Chinese" tags drop out against "Costa Rican (Caribbean)" /
  // "(Chinese)" cuisine rows. Derived from the actual cuisineGroups, not hard-coded.
  const cuisineTagNames = new Set<string>();
  cuisineGroups.forEach(g => allTags.forEach(tag => {
    if (g.cuisine.toLowerCase().includes(tag.toLowerCase())) cuisineTagNames.add(tag);
  }));
  const tagGroups = allTags
    .filter(tag => !cuisineTagNames.has(tag))
    .map(tag => ({ tag, recipes: featurable.filter(r => r.tags?.includes(tag)) }))
    .filter(g => g.recipes.length >= 3)
    .slice(0, 6);

  const greeting = getGreeting(locale);
  const totalCount = allRecipes.length;

  const handleViewAll = (filterCuisine?: string, filterTag?: string) => {
    if (filterCuisine) setCuisine(filterCuisine);
    if (filterTag) setActiveTag(filterTag);
    setShowGrid(true);
    setShowSearch(true);
  };

  if (allRecipes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-7xl mb-6">🌿</div>
        <h1 className="text-3xl mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
          {t(locale, 'home_empty_title')}
        </h1>
        <p className="text-base mb-10" style={{ color: 'var(--muted)' }}>
          {t(locale, 'home_empty_hint')}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {isAdmin && (
            <Link href={`/${lang}/import`} className="px-6 py-3 text-sm font-medium text-white rounded-xl"
              style={{ background: 'var(--accent)' }}>
              {t(locale, 'home_import_url')}
            </Link>
          )}
          <Link href={`/${lang}/identify`} className="px-6 py-3 text-sm font-medium text-white rounded-xl"
            style={{ background: 'var(--secondary)' }}>
            {t(locale, 'home_scan')}
          </Link>
          {isAdmin && (
            <Link href={`/${lang}/recipes/new`} className="px-6 py-3 text-sm font-medium border rounded-xl"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {t(locale, 'home_add_manual')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const showingGrid = isFiltering || showGrid;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
              {greeting.emoji} {greeting.text}
            </p>
            <h1 className="text-2xl leading-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
              {showingGrid
                ? (isFiltering
                  ? (recipes.length === 1 ? t(locale, 'home_results_one', { n: 1 }) : t(locale, 'home_results_many', { n: recipes.length }))
                  : t(locale, 'home_all_count', { n: totalCount }))
                : t(locale, 'home_title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {showingGrid && (
              <button onClick={() => { setSearch(''); setCuisine(''); setActiveTag(''); setShowGrid(false); }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--card)' }}>
                {t(locale, 'home_back')}
              </button>
            )}
            <button onClick={() => setShowSearch(true)} aria-label={t(locale, 'home_search')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
              <Search size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{t(locale, 'home_search')}</span>
              {isFiltering && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
            {isAdmin && (
              <Link href={`/${lang}/recipes/new`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ background: 'var(--accent)' }}>
                <span>+</span>
                <span className="hidden sm:inline">{t(locale, 'home_add_recipe')}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Grid mode */}
        {showingGrid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(isFiltering ? recipes : allRecipes).map(r => (
              <RecipeCard key={r.id} recipe={r} size="standard" />
            ))}
          </div>
        ) : (
          <>
            {/* Hero cluster */}
            {hero && (
              <div className="grid gap-4 mb-10"
                style={{ gridTemplateColumns: heroSecondary.length >= 2 ? '3fr 2fr' : '1fr', gridTemplateRows: '320px' }}>
                <div style={{ gridRow: '1 / -1' }}>
                  <RecipeCard recipe={hero} size="hero" />
                </div>
                {heroSecondary.length >= 2 && (
                  <div className="flex flex-col gap-4 h-full overflow-hidden">
                    {heroSecondary.map(r => (
                      <div key={r.id} className="flex-1 min-h-0 overflow-hidden">
                        <RecipeCard recipe={r} size="hero" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick action chips */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link href={`/${lang}/identify`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}>
                {t(locale, 'home_what_can_cook')}
              </Link>
              {isAdmin && (
                <Link href={`/${lang}/import`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}>
                  {t(locale, 'home_import_chip')}
                </Link>
              )}
              {quickMeals.length > 0 && (
                <button
                  onClick={() => handleViewAll()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}>
                  {t(locale, 'home_under_30_chip')}
                </button>
              )}
              <button onClick={() => setShowGrid(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}>
                {t(locale, 'home_all_recipes', { n: totalCount })}
              </button>
            </div>

            {/* Recently added */}
            <RecipeRow
              title={t(locale, 'home_recently_added')}
              recipes={recent}
              viewAllLabel={t(locale, 'home_all_n', { n: totalCount })}
              onViewAll={() => setShowGrid(true)}
            />

            {/* Quick meals */}
            {quickMeals.length >= 3 && (
              <RecipeRow title={t(locale, 'home_under_30')} recipes={quickMeals} />
            )}

            {/* Cuisine rows */}
            {cuisineGroups.map(g => (
              <RecipeRow
                key={g.cuisine}
                title={localizeCuisine(g.cuisine, locale)}
                recipes={g.recipes}
                viewAllLabel={t(locale, 'home_all_n', { n: g.recipes.length })}
                onViewAll={() => handleViewAll(g.cuisine!, undefined)}
              />
            ))}

            {/* Tag rows */}
            {tagGroups.map(g => (
              <RecipeRow
                key={g.tag}
                title={`#${localizeTag(g.tag!, locale)}`}
                recipes={g.recipes}
                viewAllLabel={t(locale, 'home_all_n', { n: g.recipes.length })}
                onViewAll={() => handleViewAll(undefined, g.tag)}
              />
            ))}

            {/* Bottom CTA */}
            {totalCount < 10 && (
              <div className="mt-8 rounded-2xl p-8 text-center border"
                style={{ background: 'linear-gradient(135deg, rgba(31,138,112,0.06), rgba(241,103,69,0.04))', borderColor: 'var(--border)' }}>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {t(locale, 'home_grow_hint')}
                </p>
                {isAdmin && (
                  <Link href={`/${lang}/import`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{ background: 'var(--accent)' }}>
                    {t(locale, 'home_import_another')}
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Search overlay */}
      {showSearch && (
        <SearchOverlay
          lang={locale}
          search={search} setSearch={setSearch}
          cuisine={cuisine} setCuisine={setCuisine}
          activeTag={activeTag} setActiveTag={setActiveTag}
          cuisines={cuisines} allTags={allTags}
          onClose={() => setShowSearch(false)}
          resultCount={isFiltering ? recipes.length : totalCount}
        />
      )}
    </div>
  );
}
