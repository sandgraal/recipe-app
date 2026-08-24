import { describe, it, expect } from 'vitest';
import {
  RECIPE_CATEGORIES, DIFFICULTIES, DIETARY_FLAGS, SUGGESTED_REGIONS,
  RECIPE_CATEGORY_ES, REGION_ES, DIFFICULTY_ES, DIETARY_ES,
  deriveCategory, deriveRegion, deriveDietary, deriveDifficulty, buildTaxonomyPatch,
} from '@/lib/taxonomy';

describe('taxonomy ES label coverage', () => {
  it('every category has a Spanish label', () => {
    const missing = RECIPE_CATEGORIES.filter(c => !(c.toLowerCase() in RECIPE_CATEGORY_ES));
    expect(missing, `missing ES: ${missing.join(', ')}`).toEqual([]);
  });
  it('every difficulty has a Spanish label', () => {
    const missing = DIFFICULTIES.filter(d => !(d in DIFFICULTY_ES));
    expect(missing).toEqual([]);
  });
  it('every dietary flag has a Spanish label', () => {
    const missing = DIETARY_FLAGS.filter(f => !(f in DIETARY_ES));
    expect(missing).toEqual([]);
  });
  it('every suggested region has a Spanish label', () => {
    const missing = SUGGESTED_REGIONS.filter(r => !(r.toLowerCase() in REGION_ES));
    expect(missing, `missing ES: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('deriveCategory', () => {
  it('maps condiment tags to Sauces / Preserves first', () => {
    expect(deriveCategory(['Sauces', 'Mains'])).toBe('Sauces');
    expect(deriveCategory(['Fermented'])).toBe('Preserves');
    expect(deriveCategory(['Preserves'])).toBe('Preserves');
  });
  it('maps meal-type tags to a category', () => {
    expect(deriveCategory(['Mains'])).toBe('Mains');
    expect(deriveCategory(['Desserts'])).toBe('Desserts');
    expect(deriveCategory(['Drinks'])).toBe('Drinks');
  });
  it('returns null when nothing matches', () => {
    expect(deriveCategory(['Costa Rican', 'Chicken'])).toBeNull();
    expect(deriveCategory([])).toBeNull();
    expect(deriveCategory(null)).toBeNull();
  });
});

describe('deriveRegion', () => {
  it('splits region out of cuisine at country level', () => {
    expect(deriveRegion('Costa Rican')).toBe('Costa Rica');
    expect(deriveRegion('Costa Rican (Caribbean)')).toBe('Costa Rica');
    expect(deriveRegion('Costa Rican (Chinese)')).toBe('Costa Rica');
    expect(deriveRegion('Italian')).toBe('Italy');
    expect(deriveRegion('Korean')).toBe('Korea');
  });
  it('returns null for unknown or empty cuisine', () => {
    expect(deriveRegion('Martian')).toBeNull();
    expect(deriveRegion(null)).toBeNull();
  });
});

describe('deriveDietary', () => {
  it('extracts only explicit dietary tags', () => {
    expect(deriveDietary(['Vegetarian', 'Mains'])).toEqual(['vegetarian']);
    expect(deriveDietary(['vegan', 'gluten-free'])).toEqual(['vegan', 'gluten-free']);
  });
  it('does not infer from non-dietary tags', () => {
    expect(deriveDietary(['Chicken', 'Costa Rican'])).toEqual([]);
  });
});

describe('deriveDifficulty', () => {
  it('scores easy / medium / hard from steps and time', () => {
    expect(deriveDifficulty(3, 20)).toBe('easy');
    expect(deriveDifficulty(15, 60)).toBe('hard');
    expect(deriveDifficulty(120, null)).toBe('hard');
    expect(deriveDifficulty(8, 45)).toBe('medium');
  });
});

describe('buildTaxonomyPatch', () => {
  it('fills every empty taxonomy column for a sauce recipe', () => {
    const patch = buildTaxonomyPatch({
      tags: ['Sauces'], cuisine: 'Costa Rican',
      steps: [{ order: 1, text: 'Blend.' }], total_time: '10 min',
    });
    expect(patch).toMatchObject({
      category: 'Sauces', region: 'Costa Rica', total_time_min: 10, difficulty: 'easy',
    });
  });

  it('is idempotent — returns nothing when all fields are already set', () => {
    const patch = buildTaxonomyPatch({
      tags: ['Sauces'], cuisine: 'Costa Rican', steps: [], total_time: '10 min',
      category: 'Sauces', region: 'Costa Rica', dietary: ['vegan'],
      difficulty: 'easy', total_time_min: 10,
    });
    expect(patch).toEqual({});
  });

  it('never proposes a tags change', () => {
    const patch = buildTaxonomyPatch({ tags: ['Sauces'], cuisine: 'Italian' });
    expect(patch).not.toHaveProperty('tags');
  });
});
