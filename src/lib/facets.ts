// Data-driven facets for browse / category / region pages.
//
// The taxonomy lists in taxonomy.ts stay the vocabulary for EDITING (recipe
// form, AI import). Everything on the reading side (filter chips, landing
// pages, sitemap) is derived from the recipes that actually exist, so an option
// with no recipes never shows.
//
// Pure functions only: callers pass the card rows the page already loaded.

import type { Recipe } from './types';
import { DIETARY_FLAGS, SUGGESTED_REGIONS } from './taxonomy';
import { MAX_TIME_OPTIONS, slugify, type RecipeFilter } from './browse';

export type FacetKey = 'category' | 'region' | 'diet' | 'difficulty' | 'maxTime';

export interface FacetOption {
  /** Value written to the URL (canonical casing for regions). */
  value: string;
  /** Recipes that match every OTHER active filter and carry this value. */
  count: number;
  active: boolean;
}

export type FacetSet = Record<FacetKey, FacetOption[]>;

type CardRecipe = Pick<
  Recipe,
  'category' | 'region' | 'dietary' | 'difficulty' | 'total_time_min' | 'cuisine' | 'tags'
>;

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

// ── Matching (mirrors applyRecipeFilters, which runs in SQL) ─────────────────

/** Case-insensitive, trimmed key for free-text values (region, cuisine). */
export function textKey(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/**
 * True when the recipe passes every active filter except those in `skip`.
 * Same semantics as applyRecipeFilters: region/cuisine case-insensitive equal,
 * category/difficulty exact, tag contained, diet overlaps (any of), max time
 * is <= and excludes recipes with no known time.
 */
export function matchesFilter(r: CardRecipe, f: RecipeFilter, skip: FacetKey[] = []): boolean {
  if (f.cuisine && textKey(r.cuisine) !== textKey(f.cuisine)) return false;
  if (f.tag && !(r.tags ?? []).includes(f.tag)) return false;
  if (f.category && !skip.includes('category') && r.category !== f.category) return false;
  if (f.region && !skip.includes('region') && textKey(r.region) !== textKey(f.region)) return false;
  if (f.difficulty && !skip.includes('difficulty') && r.difficulty !== f.difficulty) return false;
  if (f.diet?.length && !skip.includes('diet') && !(r.dietary ?? []).some(d => f.diet!.includes(d))) return false;
  if (f.maxMinutes && !skip.includes('maxTime')) {
    if (r.total_time_min == null || r.total_time_min > f.maxMinutes) return false;
  }
  return true;
}

export function filterRecipes<R extends CardRecipe>(recipes: R[], f: RecipeFilter): R[] {
  return recipes.filter(r => matchesFilter(r, f));
}

// ── Counting ─────────────────────────────────────────────────────────────────

/** Canonical display value per region key: the seed-list spelling when there is
 *  one, otherwise the first spelling seen in the data. */
const SEED_REGION = new Map(SUGGESTED_REGIONS.map(r => [textKey(r), r as string]));

function regionCounts(recipes: CardRecipe[]): Map<string, { value: string; count: number }> {
  const out = new Map<string, { value: string; count: number }>();
  for (const r of recipes) {
    const key = textKey(r.region);
    if (!key) continue;
    const hit = out.get(key);
    if (hit) hit.count += 1;
    else out.set(key, { value: SEED_REGION.get(key) ?? (r.region as string).trim(), count: 1 });
  }
  return out;
}

export interface FacetOptions {
  /** Sort locale for ties (default 'en'). */
  locale?: string;
  /** Display name used to break count ties (default: the raw value). */
  label?: (facet: FacetKey, value: string) => string;
}

function byCountThenName(label: (v: string) => string, locale: string) {
  return (a: FacetOption, b: FacetOption) =>
    b.count - a.count || label(a.value).localeCompare(label(b.value), locale);
}

/**
 * Classic faceting. Each facet is counted over the recipes that match all the
 * OTHER active filters, so an option's count is what you would get by choosing
 * it next. Options with 0 recipes are dropped. category / region / diet are
 * ordered by count then name; difficulty and max-time are ordinal scales and
 * keep their natural order.
 */
export function computeFacets(recipes: CardRecipe[], f: RecipeFilter, opts: FacetOptions = {}): FacetSet {
  const locale = opts.locale ?? 'en';
  const nameOf = (facet: FacetKey) => (v: string) => (opts.label ? opts.label(facet, v) : v);

  const pool = (skip: FacetKey) => recipes.filter(r => matchesFilter(r, f, [skip]));

  // category
  const catCount = new Map<string, number>();
  for (const r of pool('category')) if (r.category) catCount.set(r.category, (catCount.get(r.category) ?? 0) + 1);
  const category = [...catCount].map(([value, count]) => ({ value, count, active: f.category === value }))
    .sort(byCountThenName(nameOf('category'), locale));

  // region (case-insensitive grouping)
  const region = [...regionCounts(pool('region')).entries()]
    .map(([key, { value, count }]) => ({ value, count, active: textKey(f.region) === key }))
    .sort(byCountThenName(nameOf('region'), locale));

  // diet (only the flags the URL parser accepts)
  const dietCount = new Map<string, number>();
  for (const r of pool('diet')) {
    for (const d of new Set(r.dietary ?? [])) {
      if ((DIETARY_FLAGS as readonly string[]).includes(d)) dietCount.set(d, (dietCount.get(d) ?? 0) + 1);
    }
  }
  const diet = [...dietCount].map(([value, count]) => ({ value, count, active: !!f.diet?.includes(value) }))
    .sort(byCountThenName(nameOf('diet'), locale));

  // difficulty (natural order)
  const diffCount = new Map<string, number>();
  for (const r of pool('difficulty')) if (r.difficulty) diffCount.set(r.difficulty, (diffCount.get(r.difficulty) ?? 0) + 1);
  const difficulty = [...diffCount]
    .map(([value, count]) => ({ value, count, active: f.difficulty === value }))
    .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.value) - DIFFICULTY_ORDER.indexOf(b.value));

  // max time: cumulative buckets; skip empty ones and ones that add nothing
  // over the next smaller bucket (same count = same recipes).
  const timed = pool('maxTime').filter(r => r.total_time_min != null);
  const maxTime: FacetOption[] = [];
  let prev = 0;
  for (const n of MAX_TIME_OPTIONS) {
    const count = timed.filter(r => (r.total_time_min as number) <= n).length;
    const active = f.maxMinutes === n;
    if (count > 0 && (count !== prev || active)) maxTime.push({ value: String(n), count, active });
    prev = Math.max(prev, count);
  }

  return { category, region, diet, difficulty, maxTime };
}

// ── Landing pages and sitemap ────────────────────────────────────────────────

/** Non-empty categories and regions across the whole collection. */
export function landingOptions(recipes: CardRecipe[], opts: FacetOptions = {}) {
  const { category, region } = computeFacets(recipes, {}, opts);
  return { categories: category, regions: region };
}

/** The option whose URL slug matches, or null. */
export function findBySlug(options: FacetOption[], slug: string): FacetOption | null {
  return options.find(o => slugify(o.value) === slug) ?? null;
}

// ── Active-filter chips (links, no JS) ───────────────────────────────────────

export type ActiveFilter = { key: string; value: string; kind: 'category' | 'region' | 'cuisine' | 'tag' | 'diet' | 'difficulty' | 'max' | 'q' };

export function activeFilters(f: RecipeFilter): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  if (f.q) out.push({ key: 'q', value: f.q, kind: 'q' });
  if (f.category) out.push({ key: 'category', value: f.category, kind: 'category' });
  if (f.region) out.push({ key: 'region', value: f.region, kind: 'region' });
  if (f.cuisine) out.push({ key: 'cuisine', value: f.cuisine, kind: 'cuisine' });
  if (f.tag) out.push({ key: 'tag', value: f.tag, kind: 'tag' });
  for (const d of f.diet ?? []) out.push({ key: 'diet', value: d, kind: 'diet' });
  if (f.difficulty) out.push({ key: 'difficulty', value: f.difficulty, kind: 'difficulty' });
  if (f.maxMinutes) out.push({ key: 'max', value: String(f.maxMinutes), kind: 'max' });
  return out;
}

type SP = Record<string, string | string[] | undefined>;

/** Query string with one filter removed (and paging reset). A diet value only
 *  removes that flag. Returns '' when nothing is left. */
export function queryWithout(sp: SP, remove: { key: string; value?: string }): string {
  const p = new URLSearchParams();
  for (const [k, raw] of Object.entries(sp)) {
    const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (!v || k === 'show') continue;
    if (k !== remove.key) { p.set(k, v); continue; }
    if (k === 'diet' && remove.value) {
      const rest = v.split(',').map(s => s.trim()).filter(s => s && s !== remove.value);
      if (rest.length) p.set('diet', rest.join(','));
    }
  }
  return p.toString();
}
