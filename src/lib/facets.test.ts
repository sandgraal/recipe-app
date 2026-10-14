import { describe, it, expect } from 'vitest';
import {
  computeFacets, filterRecipes, matchesFilter, landingOptions, findBySlug, activeFilters, queryWithout,
} from '@/lib/facets';
import { parseFilter, applyRecipeFilters } from '@/lib/browse';

type R = Parameters<typeof matchesFilter>[0];
const r = (o: Partial<R>): R => ({
  category: null, region: null, dietary: null, difficulty: null, total_time_min: null, cuisine: null, tags: [], ...o,
});

// Small stand-in for the live collection.
const recipes: R[] = [
  r({ category: 'Mains', region: 'Costa Rica', dietary: ['vegetarian'], difficulty: 'easy', total_time_min: 25 }),
  r({ category: 'Mains', region: 'costa rica', dietary: [], difficulty: 'medium', total_time_min: 50 }),
  r({ category: 'Soups', region: 'Costa Rica', dietary: ['vegetarian', 'vegan'], difficulty: 'easy', total_time_min: 20 }),
  r({ category: 'Soups', region: 'Korea', dietary: null, difficulty: 'hard', total_time_min: 90 }),
  r({ category: 'Desserts', region: 'Korea', dietary: ['gluten-free'], difficulty: 'easy', total_time_min: 10 }),
  r({ category: null, region: null, dietary: [], difficulty: null, total_time_min: null }),
];
const opts = (f = {}) => computeFacets(recipes, f);
const pairs = (o: { value: string; count: number }[]) => o.map(x => [x.value, x.count]);

describe('computeFacets (no filter)', () => {
  it('counts each facet from the data and orders by count then name', () => {
    const f = opts();
    expect(pairs(f.category)).toEqual([['Mains', 2], ['Soups', 2], ['Desserts', 1]]);
    // "Costa Rica" and "costa rica" are one option, seed casing wins.
    expect(pairs(f.region)).toEqual([['Costa Rica', 3], ['Korea', 2]]);
    expect(pairs(f.diet)).toEqual([['vegetarian', 2], ['gluten-free', 1], ['vegan', 1]]);
  });
  it('never lists an option with no recipes', () => {
    const f = opts();
    expect(f.region.map(o => o.value)).not.toContain('Caribbean');
    expect(f.category.map(o => o.value)).not.toContain('Breads');
    expect(f.diet.map(o => o.value)).not.toContain('keto');
    for (const list of Object.values(f)) for (const o of list) expect(o.count).toBeGreaterThan(0);
  });
  it('keeps difficulty in natural order', () => {
    expect(pairs(opts().difficulty)).toEqual([['easy', 3], ['medium', 1], ['hard', 1]]);
  });
  it('builds cumulative time buckets and drops empty/redundant ones', () => {
    // <=15: 1 (10), <=30: 3, <=45: 3 (redundant), <=60: 4
    expect(pairs(opts().maxTime)).toEqual([['15', 1], ['30', 3], ['60', 4]]);
  });
  it('breaks count ties with the supplied label (locale aware)', () => {
    const labels: Record<string, string> = { Mains: 'Zeta', Soups: 'Alfa', Desserts: 'Beta' };
    const f = computeFacets(recipes, {}, { label: (_k, v) => labels[v] ?? v });
    expect(f.category.map(o => o.value)).toEqual(['Soups', 'Mains', 'Desserts']);
  });
});

describe('combined filters (classic faceting)', () => {
  it('counts a facet over the other filters, not itself', () => {
    const f = opts({ category: 'Soups' });
    // Region counts are limited to soups...
    expect(pairs(f.region)).toEqual([['Costa Rica', 1], ['Korea', 1]]);
    // ...but the category facet still shows its siblings so you can switch.
    expect(pairs(f.category)).toEqual([['Mains', 2], ['Soups', 2], ['Desserts', 1]]);
    expect(f.category.find(o => o.value === 'Soups')?.active).toBe(true);
  });
  it('hides options that would lead to zero results', () => {
    const f = opts({ region: 'Korea' });
    expect(f.category.map(o => o.value).sort()).toEqual(['Desserts', 'Soups']);
    expect(f.diet.map(o => o.value)).toEqual(['gluten-free']);
  });
  it('matches region case-insensitively and diet as any-of', () => {
    expect(filterRecipes(recipes, { region: 'COSTA RICA' })).toHaveLength(3);
    expect(filterRecipes(recipes, { diet: ['vegan', 'gluten-free'] })).toHaveLength(2);
  });
  it('time filter excludes recipes with no known time', () => {
    expect(filterRecipes(recipes, { maxMinutes: 60 })).toHaveLength(4);
  });
  it('narrows time buckets by the other filters', () => {
    expect(pairs(opts({ category: 'Desserts' }).maxTime)).toEqual([['15', 1]]);
  });
});

describe('empty states and stale links', () => {
  it('an unknown filter value matches nothing but is still reported as active', () => {
    const f = { region: 'Caribbean' };
    expect(filterRecipes(recipes, f)).toEqual([]);
    expect(activeFilters(f)).toEqual([{ key: 'region', value: 'Caribbean', kind: 'region' }]);
    // With zero results the other facets are all empty-or-narrowed, never crash.
    const facets = opts(f);
    expect(facets.region.length).toBe(2); // region facet ignores its own filter
  });
  it('removing the stale filter restores the full list', () => {
    expect(queryWithout({ region: 'Caribbean', sort: 'az' }, { key: 'region' })).toBe('sort=az');
    expect(filterRecipes(recipes, parseFilter({ sort: 'az' }))).toHaveLength(6);
  });
  it('an empty collection gives empty facets', () => {
    const f = computeFacets([], {});
    for (const list of Object.values(f)) expect(list).toEqual([]);
  });
});

describe('landing pages', () => {
  it('lists only non-empty categories and regions', () => {
    const l = landingOptions(recipes);
    expect(l.regions.map(o => o.value)).toEqual(['Costa Rica', 'Korea']);
    expect(l.categories.map(o => o.value)).toEqual(['Mains', 'Soups', 'Desserts']);
  });
  it('resolves slugs against the data, not the seed list', () => {
    const l = landingOptions(recipes);
    expect(findBySlug(l.regions, 'costa-rica')?.value).toBe('Costa Rica');
    expect(findBySlug(l.regions, 'caribbean')).toBeNull();
    const free = landingOptions([r({ region: 'Greece' })]);
    expect(findBySlug(free.regions, 'greece')?.value).toBe('Greece');
  });
});

describe('queryWithout', () => {
  it('removes one diet flag and keeps the rest', () => {
    expect(queryWithout({ diet: 'vegan,keto', region: 'Korea' }, { key: 'diet', value: 'keto' })).toBe('diet=vegan&region=Korea');
    expect(queryWithout({ diet: 'keto' }, { key: 'diet', value: 'keto' })).toBe('');
  });
  it('drops paging', () => {
    expect(queryWithout({ category: 'Mains', show: '120' }, { key: 'category' })).toBe('');
  });
});

describe('parity with applyRecipeFilters', () => {
  // The SQL path and the in-memory path must agree on which filters exist.
  it('every filter the SQL builder applies is honoured in memory', () => {
    const calls: string[] = [];
    const spy: Record<string, (...a: unknown[]) => unknown> = new Proxy({}, {
      get: (_t, name: string) => (...a: unknown[]) => { calls.push(`${name}:${a[0]}`); return spy; },
    });
    applyRecipeFilters(spy, {
      cuisine: 'x', category: 'Mains', region: 'Korea', difficulty: 'easy', tag: 't', diet: ['vegan'], maxMinutes: 30,
    });
    expect(calls.map(c => c.split(':')[1]).sort()).toEqual(
      ['category', 'cuisine', 'dietary', 'difficulty', 'region', 'tags', 'total_time_min'],
    );
  });
});
