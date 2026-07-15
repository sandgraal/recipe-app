import { describe, it, expect } from 'vitest';
import { findIngredientLink, toIngredientLinkCandidates, isIngredientRecipe } from '@/lib/ingredientLinks';

const CANDIDATES = toIngredientLinkCandidates(
  [
    { id: 'ketchup-id', title: 'Ketchup (Classic Homemade)', title_es: 'Ketchup (Casero Clásico)', tags: ['Condiments'] },
    { id: 'chipotle-id', title: 'Chipotle Adobo-Style Smoky Hot Sauce', title_es: null, tags: ['Hot Sauce', 'Condiment'] },
    { id: 'cholula-id', title: 'Cholula-Style Sweet Habanero Hot Sauce', title_es: null, tags: ['Hot Sauce', 'Condiment'] },
    { id: 'rice-id', title: 'Steamed White Rice', title_es: 'Arroz Blanco al Vapor', tags: ['Sides', 'Rice'] },
    { id: 'unrelated-id', title: 'Rice and Beans (Caribeño)', title_es: null, tags: ['Costa Rican', 'Mains'] },
  ],
  'exclude-none',
);

describe('findIngredientLink', () => {
  it('links a single match (English)', () => {
    const match = findIngredientLink('ketchup', CANDIDATES, 'some-other-recipe');
    expect(match?.recipes.map(r => r.id)).toEqual(['ketchup-id']);
    expect(match?.matchedText).toBe('ketchup');
  });

  it('links a single match (Spanish variant, different word than the English phrase)', () => {
    const match = findIngredientLink('catsup', CANDIDATES, 'some-other-recipe');
    expect(match?.recipes.map(r => r.id)).toEqual(['ketchup-id']);
  });

  it('returns null when nothing matches', () => {
    expect(findIngredientLink('black pepper', CANDIDATES, 'some-other-recipe')).toBeNull();
  });

  it('returns every candidate for an ambiguous phrase', () => {
    const match = findIngredientLink('a splash of hot sauce', CANDIDATES, 'some-other-recipe');
    expect(match?.recipes.map(r => r.id).sort()).toEqual(['chipotle-id', 'cholula-id']);
  });

  it('excludes the current recipe from its own match', () => {
    expect(findIngredientLink('ketchup', CANDIDATES, 'ketchup-id')).toBeNull();
  });

  it('returns null for text with no ingredient at all', () => {
    expect(findIngredientLink('', CANDIDATES, 'some-other-recipe')).toBeNull();
  });
});

describe('isIngredientRecipe', () => {
  it('accepts recipes tagged as condiments/sauces/ferments', () => {
    expect(isIngredientRecipe({ title: 'Kimchi', tags: ['Fermented'] })).toBe(true);
  });

  it('accepts the manual staple allow-list even without a matching tag', () => {
    expect(isIngredientRecipe({ title: 'Steamed White Rice', tags: ['Sides'] })).toBe(true);
  });

  it('rejects a dish that merely contains rice/beans as ingredients', () => {
    expect(isIngredientRecipe({ title: 'Rice and Beans (Caribeño)', tags: ['Mains'] })).toBe(false);
  });
});

describe('toIngredientLinkCandidates', () => {
  it('drops recipes that are not ingredient recipes', () => {
    expect(CANDIDATES.some(c => c.id === 'unrelated-id')).toBe(false);
  });

  it('drops the excluded recipe id', () => {
    const withoutRice = toIngredientLinkCandidates(
      [{ id: 'rice-id', title: 'Steamed White Rice', title_es: null, tags: ['Sides', 'Rice'] }],
      'rice-id',
    );
    expect(withoutRice).toEqual([]);
  });
});
