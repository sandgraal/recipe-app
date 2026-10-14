import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { makeFakeSupabase, type Handler } from '@/lib/testing/fakeSupabase';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

let fake = makeFakeSupabase({});
vi.mock('@/lib/supabase', () => ({ getServiceSupabase: () => fake.client, getSupabase: () => fake.client }));

import { POST } from './route';

const SECRET = 'admin-secret-for-tests';
const R1 = '3f2b7c1e-8a4d-4e5f-9b6a-1c2d3e4f5a6b';
const R2 = '0b9d6a2c-5e7f-4a1b-8c3d-9e0f1a2b3c4d';

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const auth = { Authorization: `Bearer ${SECRET}` };

const recipesRows: Handler = () => ({
  data: [
    { id: R1, ingredients: [{ item: 'Tomato', amount: '2', unit: '' }], ingredients_es: [{ item: 'Tomate' }] },
    { id: R2, ingredients: [{ item: 'Tomato', amount: '1', unit: '' }], ingredients_es: null },
  ],
  error: null,
});

let savedSecret: string | undefined;
beforeEach(() => {
  savedSecret = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = SECRET;
  revalidatePath.mockReset();
  fake = makeFakeSupabase({});
});
afterEach(() => {
  if (savedSecret === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = savedSecret;
});

describe('POST /api/meals', () => {
  it('401 without auth, and touches nothing', async () => {
    const res = await POST(post({ title: 'X', recipe_ids: [R1] }));
    expect(res.status).toBe(401);
    expect(fake.calls).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('401 with the wrong password', async () => {
    const res = await POST(post({ title: 'X', recipe_ids: [R1] }, { Authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
  });

  it('422 for an invalid body (not a uuid / no recipes)', async () => {
    expect((await POST(post({ title: 'X', recipe_ids: ['nope'] }, auth))).status).toBe(422);
    expect((await POST(post({ title: 'X', recipe_ids: [] }, auth))).status).toBe(422);
    expect((await POST(post({ recipe_ids: [R1] }, auth))).status).toBe(422);
    expect(fake.calls).toEqual([]);
  });

  it('422 when a recipe id does not exist', async () => {
    fake = makeFakeSupabase({ 'recipes.select': () => ({ data: [{ id: R1, ingredients: [], ingredients_es: null }], error: null }) });
    const res = await POST(post({ title: 'X', recipe_ids: [R1, R2] }, auth));
    expect(res.status).toBe(422);
    expect((await res.json()).missing).toEqual([R2]);
    expect(fake.calls.some(c => c.verb === 'insert')).toBe(false);
  });

  it('creates the meal with a slug from the title and a shopping list built from the recipes, then revalidates', async () => {
    fake = makeFakeSupabase({
      'recipes.select': recipesRows,
      'meal_groups.insert': c => ({ data: { id: 'new-id', ...(c.args[0] as object[])[0] }, error: null }),
    });
    const res = await POST(post({ title: 'Sunday Lunch', title_es: 'Almuerzo', recipe_ids: [R1, R2], id: 'evil', created_at: 'x' }, auth));
    expect(res.status).toBe(201);
    const insert = fake.calls.find(c => c.table === 'meal_groups' && c.verb === 'insert')!;
    const row = (insert.args[0] as Array<Record<string, unknown>>)[0];
    expect(row).toMatchObject({ title: 'Sunday Lunch', title_es: 'Almuerzo', slug: 'sunday-lunch', recipe_ids: [R1, R2] });
    expect(row.id).toBeUndefined();
    expect(row.created_at).toBeUndefined();
    expect(row.shopping_list).toEqual([
      { aisle: 'Produce', aisle_es: 'Frutas y verduras', items: [{ name: 'Tomato', name_es: 'Tomate', qty: '3', qty_es: '3' }] },
    ]);
    const paths = revalidatePath.mock.calls.map(c => c[0]);
    expect(paths).toEqual(expect.arrayContaining(['/en/meals', '/es/meals', '/en/meals/sunday-lunch', '/es/meals/sunday-lunch', '/en', '/es']));
  });

  it('409 when the slug is already used', async () => {
    fake = makeFakeSupabase({
      'recipes.select': recipesRows,
      'meal_groups.insert': () => ({ data: null, error: { message: 'duplicate key', code: '23505' } }),
    });
    const res = await POST(post({ title: 'X', slug: 'taken', recipe_ids: [R1] }, auth));
    expect(res.status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
