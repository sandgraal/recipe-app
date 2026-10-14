import { describe, it, expect } from 'vitest';
import { isValidSlug, slugify, sameRecipeSet, mealPaths } from '@/lib/meals';
import { mealCreateSchema, mealUpdateSchema } from '@/lib/schemas';

const A = '3f2b7c1e-8a4d-4e5f-9b6a-1c2d3e4f5a6b';
const B = '0b9d6a2c-5e7f-4a1b-8c3d-9e0f1a2b3c4d';

describe('slug helpers', () => {
  it('accepts kebab-case and rejects everything else', () => {
    for (const ok of ['a', 'gallo-pinto', 'fiesta-2', 'a1-b2-c3']) expect(isValidSlug(ok)).toBe(true);
    for (const bad of ['', 'Gallo', 'a b', 'a_b', '-a', 'a-', 'a--b', 'café', 'x'.repeat(81)]) expect(isValidSlug(bad)).toBe(false);
  });
  it('slugify makes a valid slug from a title', () => {
    expect(slugify('Gallo Pinto & Café!')).toBe('gallo-pinto-and-cafe');
    expect(slugify('  Cena   de domingo  ')).toBe('cena-de-domingo');
    expect(isValidSlug(slugify('Año nuevo: arroz con pollo'))).toBe(true);
    expect(slugify('!!!')).toBe('');
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('sameRecipeSet', () => {
  it('ignores order but not membership', () => {
    expect(sameRecipeSet([A, B], [B, A])).toBe(true);
    expect(sameRecipeSet([A], [A, B])).toBe(false);
    expect(sameRecipeSet([A, B], [A, A])).toBe(false);
  });
});

describe('mealPaths', () => {
  it('covers both meals lists, home pages and each slug in both languages', () => {
    const p = mealPaths(['one', null, 'two', 'one']);
    expect(p).toEqual(expect.arrayContaining(['/en', '/es', '/en/meals', '/es/meals', '/en/meals/one', '/es/meals/one', '/en/meals/two', '/es/meals/two']));
    expect(p.filter(x => x === '/en/meals/one')).toHaveLength(1);
  });
});

describe('mealCreateSchema', () => {
  it('accepts title + recipe ids and strips unknown columns', () => {
    const r = mealCreateSchema.safeParse({
      title: ' Sunday lunch ', recipe_ids: [A, B, A], id: 'evil', created_at: 'x', shopping_list: [{ aisle: 'x' }], is_admin: true,
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.title).toBe('Sunday lunch');
    expect(r.data.recipe_ids).toEqual([A, B]); // de-duplicated, order kept
    expect(Object.keys(r.data).sort()).toEqual(['recipe_ids', 'title']);
  });
  it('turns blank optional text into null', () => {
    const r = mealCreateSchema.safeParse({ title: 'X', recipe_ids: [A], title_es: '  ', note: '', note_es: null });
    expect(r.success && r.data).toMatchObject({ title_es: null, note: null, note_es: null });
  });
  it('requires a title and at least one valid uuid', () => {
    expect(mealCreateSchema.safeParse({ recipe_ids: [A] }).success).toBe(false);
    expect(mealCreateSchema.safeParse({ title: '', recipe_ids: [A] }).success).toBe(false);
    expect(mealCreateSchema.safeParse({ title: 'X', recipe_ids: [] }).success).toBe(false);
    expect(mealCreateSchema.safeParse({ title: 'X' }).success).toBe(false);
    expect(mealCreateSchema.safeParse({ title: 'X', recipe_ids: ['not-a-uuid'] }).success).toBe(false);
    expect(mealCreateSchema.safeParse({ title: 'X', recipe_ids: [A, 42] }).success).toBe(false);
  });
  it('validates the slug when one is given', () => {
    expect(mealCreateSchema.safeParse({ title: 'X', recipe_ids: [A], slug: 'ok-slug' }).success).toBe(true);
    expect(mealCreateSchema.safeParse({ title: 'X', recipe_ids: [A], slug: 'Not Ok' }).success).toBe(false);
    expect(mealCreateSchema.safeParse({ title: 'X', recipe_ids: [A], slug: '../etc' }).success).toBe(false);
  });
});

describe('mealUpdateSchema', () => {
  it('allows a partial edit and does not invent fields that were not sent', () => {
    const r = mealUpdateSchema.safeParse({ title: 'New title' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ title: 'New title' });
  });
  it('can clear the Spanish text with an empty string', () => {
    const r = mealUpdateSchema.safeParse({ title_es: '' });
    expect(r.success && r.data).toEqual({ title_es: null });
  });
  it('still rejects bad ids, empty recipe lists and bad slugs', () => {
    expect(mealUpdateSchema.safeParse({ recipe_ids: [] }).success).toBe(false);
    expect(mealUpdateSchema.safeParse({ recipe_ids: ['nope'] }).success).toBe(false);
    expect(mealUpdateSchema.safeParse({ slug: 'Bad Slug' }).success).toBe(false);
    expect(mealUpdateSchema.safeParse({ title: '' }).success).toBe(false);
  });
  it('strips unknown columns', () => {
    const r = mealUpdateSchema.safeParse({ title: 'T', id: 'x', shopping_list: [], created_at: 'y' });
    expect(r.success && r.data).toEqual({ title: 'T' });
  });
});
