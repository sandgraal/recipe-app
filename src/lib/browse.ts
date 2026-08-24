// Faceted browse: the single source of truth for parsing filter state from a
// URL query string, applying it to a Supabase query, and sorting results. Used
// by the /browse, /category, /region and /search server pages and by the
// GET /api/recipes route, so the two never drift.

import type { Recipe } from './types';
import { RECIPE_CATEGORIES, DIFFICULTIES, DIETARY_FLAGS, SUGGESTED_REGIONS } from './taxonomy';

export const SORT_KEYS = ['newest', 'quickest', 'az', 'difficulty'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = 'newest';

export const MAX_TIME_OPTIONS = [15, 30, 45, 60] as const;

export interface RecipeFilter {
  q?: string;
  category?: string;
  region?: string;
  cuisine?: string;
  tag?: string;
  diet?: string[];
  difficulty?: string;
  maxMinutes?: number;
  sort?: SortKey;
}

// ── URL slugs for landing pages ───────────────────────────────────────────────

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}
export function categoryFromSlug(slug: string): string | null {
  return RECIPE_CATEGORIES.find(c => slugify(c) === slug) ?? null;
}
export function regionFromSlug(slug: string): string | null {
  return SUGGESTED_REGIONS.find(r => slugify(r) === slug) ?? null;
}

// ── Parse a search-params object into a validated filter ──────────────────────

type SearchParams = Record<string, string | string[] | undefined>;
// Trim so leading/trailing whitespace from a hand-typed or copy-pasted URL
// (notably `?q=`) doesn't change matching or make a valid query return nothing.
function first(v: string | string[] | undefined): string | undefined {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s || undefined;
}

export function parseFilter(sp: SearchParams): RecipeFilter {
  const dietList = (first(sp.diet) ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(d => (DIETARY_FLAGS as readonly string[]).includes(d));

  const difficultyRaw = first(sp.difficulty);
  const difficulty =
    difficultyRaw && (DIFFICULTIES as readonly string[]).includes(difficultyRaw) ? difficultyRaw : undefined;

  const maxRaw = Number(first(sp.max));
  const maxMinutes = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined;

  const sortRaw = first(sp.sort);
  const sort = sortRaw && (SORT_KEYS as readonly string[]).includes(sortRaw) ? (sortRaw as SortKey) : DEFAULT_SORT;

  return {
    q: first(sp.q),
    category: first(sp.category),
    region: first(sp.region),
    cuisine: first(sp.cuisine),
    tag: first(sp.tag),
    diet: dietList.length ? dietList : undefined,
    difficulty,
    maxMinutes,
    sort,
  };
}

/** True when any facet (other than the default sort) is set. */
export function isFilterActive(f: RecipeFilter): boolean {
  return !!(
    f.q || f.category || f.region || f.cuisine || f.tag ||
    (f.diet && f.diet.length) || f.difficulty || f.maxMinutes
  );
}

// ── Apply filters to a PostgREST query builder ────────────────────────────────
// Kept generic (no Supabase import) so it composes onto either a table select or
// the search_recipes RPC (which returns `setof recipes`, so column filters chain).

export function applyRecipeFilters<Q>(query: Q, f: RecipeFilter): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (f.cuisine) q = q.ilike('cuisine', f.cuisine);
  if (f.category) q = q.eq('category', f.category);
  if (f.region) q = q.ilike('region', f.region);
  if (f.difficulty) q = q.eq('difficulty', f.difficulty);
  if (f.tag) q = q.contains('tags', [f.tag]);
  if (f.diet && f.diet.length) q = q.overlaps('dietary', f.diet);
  if (f.maxMinutes) q = q.lte('total_time_min', f.maxMinutes);
  return q as Q;
}

// ── Sort in JS (handles nulls-last for time and the difficulty rank) ──────────

const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export function sortRecipes(recipes: Recipe[], sort: SortKey = DEFAULT_SORT): Recipe[] {
  const arr = [...recipes];
  switch (sort) {
    case 'az':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'quickest':
      return arr.sort((a, b) => (a.total_time_min ?? Infinity) - (b.total_time_min ?? Infinity));
    case 'difficulty':
      return arr.sort(
        (a, b) => (DIFFICULTY_RANK[a.difficulty ?? ''] ?? 99) - (DIFFICULTY_RANK[b.difficulty ?? ''] ?? 99),
      );
    case 'newest':
    default:
      return arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }
}
