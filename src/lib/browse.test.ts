import { describe, it, expect } from 'vitest';
import type { Recipe } from '@/lib/types';
import {
  slugify, categoryFromSlug, regionFromSlug, parseFilter, isFilterActive,
  applyRecipeFilters, sortRecipes,
} from '@/lib/browse';

describe('slugs', () => {
  it('slugifies and round-trips known vocab', () => {
    expect(slugify('Costa Rica')).toBe('costa-rica');
    expect(categoryFromSlug('sauces')).toBe('Sauces');
    expect(regionFromSlug('costa-rica')).toBe('Costa Rica');
    expect(regionFromSlug('west-africa')).toBe('West Africa');
  });
  it('returns null for unknown slugs', () => {
    expect(categoryFromSlug('nope')).toBeNull();
    expect(regionFromSlug('atlantis')).toBeNull();
  });
});

describe('parseFilter', () => {
  it('parses and validates facets', () => {
    const f = parseFilter({
      q: 'pinto', category: 'Mains', region: 'Costa Rica',
      diet: 'vegan,gluten-free,bogus', difficulty: 'easy', max: '30', sort: 'quickest',
    });
    expect(f).toMatchObject({
      q: 'pinto', category: 'Mains', region: 'Costa Rica',
      diet: ['vegan', 'gluten-free'], difficulty: 'easy', maxMinutes: 30, sort: 'quickest',
    });
  });
  it('drops invalid difficulty/sort and defaults sort to newest', () => {
    const f = parseFilter({ difficulty: 'trivial', sort: 'sideways' });
    expect(f.difficulty).toBeUndefined();
    expect(f.sort).toBe('newest');
  });
  it('trims whitespace from string params and drops empties', () => {
    const f = parseFilter({ q: '  gallo pinto  ', category: '  Sauces ', region: '   ' });
    expect(f.q).toBe('gallo pinto');
    expect(f.category).toBe('Sauces');
    expect(f.region).toBeUndefined();
  });
  it('isFilterActive reflects any facet', () => {
    expect(isFilterActive(parseFilter({}))).toBe(false);
    expect(isFilterActive(parseFilter({ category: 'Sauces' }))).toBe(true);
  });
});

describe('applyRecipeFilters', () => {
  it('maps each facet to the right PostgREST call', () => {
    const calls: unknown[][] = [];
    const b: Record<string, (...a: unknown[]) => unknown> = {};
    for (const m of ['eq', 'ilike', 'contains', 'overlaps', 'lte']) {
      b[m] = (...args: unknown[]) => { calls.push([m, ...args]); return b; };
    }
    applyRecipeFilters(b, {
      cuisine: 'Italian', category: 'Sauces', region: 'Costa Rica',
      difficulty: 'easy', tag: 'Chicken', diet: ['vegan'], maxMinutes: 30,
    });
    expect(calls).toContainEqual(['eq', 'category', 'Sauces']);
    expect(calls).toContainEqual(['ilike', 'cuisine', 'Italian']);
    expect(calls).toContainEqual(['ilike', 'region', 'Costa Rica']);
    expect(calls).toContainEqual(['eq', 'difficulty', 'easy']);
    expect(calls).toContainEqual(['contains', 'tags', ['Chicken']]);
    expect(calls).toContainEqual(['overlaps', 'dietary', ['vegan']]);
    expect(calls).toContainEqual(['lte', 'total_time_min', 30]);
  });
});

describe('sortRecipes', () => {
  const r = (over: Partial<Recipe>): Recipe => ({
    id: '', title: '', tags: [], ingredients: [], steps: [], source_type: 'manual',
    created_at: '', updated_at: '', ...over,
  } as Recipe);

  it('sorts A–Z, quickest (nulls last), difficulty, and newest', () => {
    const list = [
      r({ title: 'Banana', total_time_min: 30, difficulty: 'hard', created_at: '2026-01-01' }),
      r({ title: 'Apple', total_time_min: null, difficulty: 'easy', created_at: '2026-03-01' }),
      r({ title: 'Cherry', total_time_min: 10, difficulty: 'medium', created_at: '2026-02-01' }),
    ];
    expect(sortRecipes(list, 'az').map(x => x.title)).toEqual(['Apple', 'Banana', 'Cherry']);
    expect(sortRecipes(list, 'quickest').map(x => x.title)).toEqual(['Cherry', 'Banana', 'Apple']);
    expect(sortRecipes(list, 'difficulty').map(x => x.difficulty)).toEqual(['easy', 'medium', 'hard']);
    expect(sortRecipes(list, 'newest').map(x => x.title)).toEqual(['Apple', 'Cherry', 'Banana']);
  });
});
