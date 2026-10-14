import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { makeFakeSupabase } from '@/lib/testing/fakeSupabase';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock('@/lib/thumbhashServer', () => ({ computeThumbhashFromUrl: async () => null }));

let fake = makeFakeSupabase({});
vi.mock('@/lib/supabase', () => ({ getServiceSupabase: () => fake.client, getSupabase: () => fake.client }));

import { DELETE } from './route';

const SECRET = 'admin-secret-for-tests';
const RID = '3f2b7c1e-8a4d-4e5f-9b6a-1c2d3e4f5a6b';
const OTHER = '0b9d6a2c-5e7f-4a1b-8c3d-9e0f1a2b3c4d';
const auth = { Authorization: `Bearer ${SECRET}` };
const ctx = { params: Promise.resolve({ id: RID }) };
const del = (headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost/api/recipes/${RID}`, { method: 'DELETE', headers });

let savedSecret: string | undefined;
beforeEach(() => {
  savedSecret = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = SECRET;
  revalidatePath.mockReset();
});
afterEach(() => {
  if (savedSecret === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = savedSecret;
});

describe('DELETE /api/recipes/[id]', () => {
  it('401 without auth and deletes nothing', async () => {
    fake = makeFakeSupabase({});
    expect((await DELETE(del(), ctx)).status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it('removes the deleted recipe id from every meal that listed it and rebuilds their lists', async () => {
    fake = makeFakeSupabase({
      'recipes.delete': () => ({ data: null, error: null }),
      'meal_groups.select': () => ({
        data: [
          { id: 'm1', slug: 'one', recipe_ids: [RID, OTHER] },
          { id: 'm2', slug: 'two', recipe_ids: [OTHER] }, // untouched
          { id: 'm3', slug: 'three', recipe_ids: [RID] },
        ],
        error: null,
      }),
      'recipes.select': () => ({ data: [{ id: OTHER, ingredients: [{ item: 'Rice', amount: '1', unit: 'cup' }], ingredients_es: null }], error: null }),
      'meal_groups.update': () => ({ data: null, error: null }),
    });
    const res = await DELETE(del(auth), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const updates = fake.calls.filter(c => c.table === 'meal_groups' && c.verb === 'update');
    expect(updates).toHaveLength(2); // m1 and m3 only
    const m1 = updates.find(u => u.filters.some(([f, a]) => f === 'eq' && a[1] === 'm1'))!.args[0] as Record<string, unknown>;
    expect(m1.recipe_ids).toEqual([OTHER]);
    expect(m1.shopping_list).toEqual([expect.objectContaining({ aisle: 'Pantry' })]);
    const m3 = updates.find(u => u.filters.some(([f, a]) => f === 'eq' && a[1] === 'm3'))!.args[0] as Record<string, unknown>;
    expect(m3.recipe_ids).toEqual([]);
    expect(m3.shopping_list).toEqual([]);

    // the recipe is deleted before any meal is touched
    const order = fake.calls.map(c => `${c.table}.${c.verb}`);
    expect(order.indexOf('recipes.delete')).toBeLessThan(order.indexOf('meal_groups.update'));
    expect(revalidatePath.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['/en/meals/one', '/es/meals/three']));
  });

  it('does not touch meals or revalidate when no meal lists the recipe', async () => {
    fake = makeFakeSupabase({
      'recipes.delete': () => ({ data: null, error: null }),
      'meal_groups.select': () => ({ data: [{ id: 'm2', slug: 'two', recipe_ids: [OTHER] }], error: null }),
    });
    expect((await DELETE(del(auth), ctx)).status).toBe(200);
    expect(fake.calls.some(c => c.verb === 'update')).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('still succeeds (and says so) if the meal cleanup fails after the recipe is gone', async () => {
    fake = makeFakeSupabase({
      'recipes.delete': () => ({ data: null, error: null }),
      'meal_groups.select': () => ({ data: null, error: { message: 'boom' } }),
    });
    const res = await DELETE(del(auth), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).mealCleanupFailed).toBe(true);
  });

  it('500 and no meal cleanup when the recipe delete itself fails', async () => {
    fake = makeFakeSupabase({ 'recipes.delete': () => ({ data: null, error: { message: 'nope' } }) });
    expect((await DELETE(del(auth), ctx)).status).toBe(500);
    expect(fake.calls.some(c => c.table === 'meal_groups')).toBe(false);
  });
});
