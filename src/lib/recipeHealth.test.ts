import { describe, it, expect } from 'vitest';
import {
  recipeIssues, classifyRecipes, classifyMeals, mealIssues, countByIssue,
  type HealthRecipe, type HealthMeal,
} from '@/lib/recipeHealth';

const ing = (n: number) => Array.from({ length: n }, (_, i) => ({ amount: '1', unit: 'cup', item: `x${i}` }));
const steps = [{ order: 1, text: 'Cook.' }];

const healthy: HealthRecipe = {
  id: 'ok', title: 'Gallo pinto', title_es: 'Gallo pinto', image_url: 'https://x/y.jpg',
  region: 'Costa Rica', category: 'Mains', dietary: ['vegan'],
  ingredients: ing(5), steps, steps_es: steps,
};

describe('recipeIssues', () => {
  it('a complete recipe has no issues', () => {
    expect(recipeIssues(healthy)).toEqual([]);
  });

  it('flags a missing or blank cover photo', () => {
    expect(recipeIssues({ ...healthy, image_url: null })).toEqual(['no_cover']);
    expect(recipeIssues({ ...healthy, image_url: '   ' })).toEqual(['no_cover']);
    expect(recipeIssues({ ...healthy, image_url: undefined })).toEqual(['no_cover']);
  });

  it('flags a missing Spanish title', () => {
    expect(recipeIssues({ ...healthy, title_es: null })).toEqual(['no_title_es']);
    expect(recipeIssues({ ...healthy, title_es: ' ' })).toEqual(['no_title_es']);
  });

  it('flags missing Spanish steps only when there are English steps', () => {
    expect(recipeIssues({ ...healthy, steps_es: null })).toEqual(['no_steps_es']);
    expect(recipeIssues({ ...healthy, steps_es: [] })).toEqual(['no_steps_es']);
    expect(recipeIssues({ ...healthy, steps: [], steps_es: null })).toEqual([]);
  });

  it('flags missing region and category', () => {
    expect(recipeIssues({ ...healthy, region: null })).toEqual(['no_region']);
    expect(recipeIssues({ ...healthy, category: '' })).toEqual(['no_category']);
  });

  it('flags empty dietary info', () => {
    expect(recipeIssues({ ...healthy, dietary: null })).toEqual(['no_dietary']);
    expect(recipeIssues({ ...healthy, dietary: [] })).toEqual(['no_dietary']);
  });

  it('flags very short ingredient lists (2 or fewer), not 3', () => {
    expect(recipeIssues({ ...healthy, ingredients: ing(2) })).toEqual(['short_ingredients']);
    expect(recipeIssues({ ...healthy, ingredients: [] })).toEqual(['short_ingredients']);
    expect(recipeIssues({ ...healthy, ingredients: null })).toEqual(['short_ingredients']);
    expect(recipeIssues({ ...healthy, ingredients: ing(3) })).toEqual([]);
  });

  it('lists several issues in a stable order', () => {
    const bare: HealthRecipe = { id: 'b', title: 'Bare', ingredients: [], steps }; 
    expect(recipeIssues(bare)).toEqual([
      'no_cover', 'no_title_es', 'no_steps_es', 'no_region', 'no_category', 'no_dietary', 'short_ingredients',
    ]);
  });
});

describe('classifyRecipes', () => {
  it('drops healthy recipes and sorts by title', () => {
    const rows = classifyRecipes([
      { ...healthy, id: 'z', title: 'Zeta', image_url: null },
      healthy,
      { ...healthy, id: 'a', title: 'Alfa', region: null },
    ]);
    expect(rows.map(r => r.id)).toEqual(['a', 'z']);
    expect(rows[0].issues).toEqual(['no_region']);
  });

  it('returns an empty list for no recipes', () => {
    expect(classifyRecipes([])).toEqual([]);
  });
});

describe('countByIssue', () => {
  it('counts each issue and includes zeros', () => {
    const counts = countByIssue(classifyRecipes([
      { ...healthy, id: '1', title: 'One', image_url: null },
      { ...healthy, id: '2', title: 'Two', image_url: null, region: null },
    ]));
    expect(counts.no_cover).toBe(2);
    expect(counts.no_region).toBe(1);
    expect(counts.no_dietary).toBe(0);
  });
});

describe('meals', () => {
  const existing = new Set(['r1', 'r2', 'r3', 'r4']);
  const meal = (recipe_ids: string[] | null): HealthMeal => ({ id: 'm', slug: 'm-slug', title: 'Meal', recipe_ids });

  it('a meal with 3 existing recipes is healthy', () => {
    expect(mealIssues(meal(['r1', 'r2', 'r3']), existing).issues).toEqual([]);
  });

  it('flags a meal with fewer than 3 recipes', () => {
    const row = mealIssues(meal(['r1', 'r2']), existing);
    expect(row.issues).toEqual(['few_recipes']);
    expect(row.recipeCount).toBe(2);
  });

  it('flags recipes that no longer exist and counts only the live ones', () => {
    const row = mealIssues(meal(['r1', 'r2', 'gone', 'r3']), existing);
    expect(row.issues).toEqual(['missing_recipes']);
    expect(row.missingIds).toEqual(['gone']);
    expect(row.recipeCount).toBe(3);
  });

  it('flags both when a missing recipe leaves too few', () => {
    const row = mealIssues(meal(['r1', 'r2', 'gone']), existing);
    expect(row.issues).toEqual(['few_recipes', 'missing_recipes']);
  });

  it('treats a missing recipe_ids as empty and keeps a missing slug as null', () => {
    const row = mealIssues({ id: 'x', title: 'Empty', recipe_ids: null }, existing);
    expect(row.issues).toEqual(['few_recipes']);
    expect(row.slug).toBeNull();
  });

  it('classifyMeals keeps only unhealthy meals, sorted by title', () => {
    const rows = classifyMeals(
      [
        { id: '2', slug: 'z', title: 'Zeta', recipe_ids: ['r1'] },
        { id: '1', slug: 'ok', title: 'Fine', recipe_ids: ['r1', 'r2', 'r3'] },
        { id: '3', slug: 'a', title: 'Alfa', recipe_ids: ['r1', 'nope', 'r2', 'r3'] },
      ],
      existing,
    );
    expect(rows.map(r => r.id)).toEqual(['3', '2']);
  });
});
