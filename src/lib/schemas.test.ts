import { describe, it, expect } from 'vitest';
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/schemas';

const fullRecipe = {
  title: 'Gallo Pinto',
  description: 'Costa Rican rice and beans',
  servings: 4,
  total_time: '30 min',
  cuisine: 'Costa Rican',
  tags: ['breakfast', 'vegetarian'],
  ingredients: [{ amount: '2', unit: 'cups', item: 'day-old rice', notes: 'leftover' }],
  steps: [{ order: 1, text: 'Fry the rice and beans together.' }],
  notes: 'Serve with Salsa Lizano.',
  image_url: 'https://example.com/pinto.jpg',
  gallery_images: ['https://example.com/pinto.jpg'],
  source_url: null,
  source_type: 'manual',
};

describe('recipeCreateSchema', () => {
  it('accepts a complete recipe', () => {
    expect(recipeCreateSchema.safeParse(fullRecipe).success).toBe(true);
  });

  it('accepts a minimal recipe (title only)', () => {
    expect(recipeCreateSchema.safeParse({ title: 'X' }).success).toBe(true);
  });

  // Real catalog data stores `notes: null` on ingredients and `source_url: null`
  // — the schema must accept null (not just undefined) on these, or it would
  // reject most existing recipes on edit/re-save.
  it('accepts the real catalog shape (null ingredient notes, null source_url)', () => {
    const r = recipeCreateSchema.safeParse({
      title: 'Salsa Roja',
      source_url: null,
      ingredients: [
        { item: 'tomatoes', amount: '1.5', unit: 'kg', notes: null },
        { item: 'salt', amount: '1', unit: 'tsp', notes: 'to taste' },
      ],
      steps: [{ order: 1, text: 'Blend.' }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a recipe with no usable title', () => {
    expect(recipeCreateSchema.safeParse({ description: 'no title' }).success).toBe(false);
    expect(recipeCreateSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('strips injected / unknown columns (the whole point)', () => {
    const r = recipeCreateSchema.parse({
      ...fullRecipe,
      id: 'attacker-chosen-uuid',
      created_at: '1999-01-01',
      updated_at: '1999-01-01',
      is_admin: true,
      arbitrary_column: 'nope',
    });
    expect(r).not.toHaveProperty('id');
    expect(r).not.toHaveProperty('created_at');
    expect(r).not.toHaveProperty('updated_at');
    expect(r).not.toHaveProperty('is_admin');
    expect(r).not.toHaveProperty('arbitrary_column');
    expect(r.title).toBe('Gallo Pinto');
  });

  it('keeps unknown keys *inside* ingredient objects (JSONB content, not a column)', () => {
    const r = recipeCreateSchema.parse({
      title: 'X',
      ingredients: [{ item: 'rice', amount: '2', unit: 'cups', prep: 'rinsed' }],
    });
    expect(r.ingredients?.[0]).toHaveProperty('prep', 'rinsed');
  });

  it('coerces a stringified servings to a number', () => {
    const r = recipeCreateSchema.parse({ title: 'X', servings: '4' });
    expect(r.servings).toBe(4);
  });

  it('accepts every import source_type', () => {
    for (const source_type of ['manual', 'url', 'text', 'photo', 'chat']) {
      expect(recipeCreateSchema.safeParse({ title: 'X', source_type }).success).toBe(true);
    }
  });
});

describe('recipeUpdateSchema', () => {
  it('accepts a partial update (no title required)', () => {
    expect(recipeUpdateSchema.safeParse({ notes: 'updated' }).success).toBe(true);
  });

  it('still strips unknown columns on update', () => {
    const r = recipeUpdateSchema.parse({ title: 'New', id: 'x', evil: 1 });
    expect(r).not.toHaveProperty('id');
    expect(r).not.toHaveProperty('evil');
    expect(r.title).toBe('New');
  });
});
