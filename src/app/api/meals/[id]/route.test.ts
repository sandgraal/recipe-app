import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { makeFakeSupabase } from '@/lib/testing/fakeSupabase';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

let fake = makeFakeSupabase({});
vi.mock('@/lib/supabase', () => ({ getServiceSupabase: () => fake.client, getSupabase: () => fake.client }));

import { PUT, DELETE } from './route';

const SECRET = 'admin-secret-for-tests';
const ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const R1 = '3f2b7c1e-8a4d-4e5f-9b6a-1c2d3e4f5a6b';
const R2 = '0b9d6a2c-5e7f-4a1b-8c3d-9e0f1a2b3c4d';
const auth = { Authorization: `Bearer ${SECRET}` };
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });

function req(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/meals/${ID}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const MEAL_ROW = { id: ID, slug: 'sunday-lunch', title: 'Sunday lunch', title_es: null, note: null, note_es: null, recipe_ids: [R1], shopping_list: [], created_at: '2026-01-01' };

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

describe('auth', () => {
  it('PUT and DELETE return 401 without auth and touch nothing', async () => {
    expect((await PUT(req('PUT', { title: 'x' }), ctx())).status).toBe(401);
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(401);
    expect(fake.calls).toEqual([]);
  });
  it('401 with a wrong bearer token', async () => {
    expect((await DELETE(req('DELETE', undefined, { Authorization: 'Bearer nope' }), ctx())).status).toBe(401);
  });
});

describe('PUT /api/meals/[id]', () => {
  it('404 for an id that is not a uuid, without querying', async () => {
    expect((await PUT(req('PUT', { title: 'x' }, auth), ctx('not-a-uuid'))).status).toBe(404);
    expect(fake.calls).toEqual([]);
  });

  it('422 for an invalid body or an empty edit', async () => {
    expect((await PUT(req('PUT', { recipe_ids: ['nope'] }, auth), ctx())).status).toBe(422);
    expect((await PUT(req('PUT', { unknown_column: 1 }, auth), ctx())).status).toBe(422);
  });

  it('404 when the meal does not exist', async () => {
    fake = makeFakeSupabase({ 'meal_groups.select': () => ({ data: null, error: null }) });
    expect((await PUT(req('PUT', { title: 'x' }, auth), ctx())).status).toBe(404);
  });

  it('updates only the sent fields (no shopping-list rebuild when recipes are untouched) and revalidates old + new slug', async () => {
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: { id: ID, slug: 'sunday-lunch', recipe_ids: [R1] }, error: null }),
      'meal_groups.update': c => ({ data: { id: ID, slug: 'new-slug', ...(c.args[0] as object) }, error: null }),
    });
    const res = await PUT(req('PUT', { title: 'Renamed', slug: 'new-slug', id: 'evil', shopping_list: ['x'] }, auth), ctx());
    expect(res.status).toBe(200);
    const upd = fake.calls.find(c => c.verb === 'update')!;
    expect(upd.args[0]).toEqual({ title: 'Renamed', slug: 'new-slug' });
    const paths = revalidatePath.mock.calls.map(c => c[0]);
    expect(paths).toEqual(expect.arrayContaining(['/en/meals/sunday-lunch', '/es/meals/sunday-lunch', '/en/meals/new-slug', '/es/meals/new-slug', '/en/meals', '/es/meals']));
  });

  it('rebuilds the shopping list when the set of recipes changes', async () => {
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: { id: ID, slug: 'sunday-lunch', recipe_ids: [R1] }, error: null }),
      'recipes.select': () => ({
        data: [
          { id: R1, ingredients: [{ item: 'Rice', amount: '1', unit: 'cup' }], ingredients_es: null },
          { id: R2, ingredients: [{ item: 'Rice', amount: '1', unit: 'cup' }], ingredients_es: null },
        ],
        error: null,
      }),
      'meal_groups.update': c => ({ data: { id: ID, slug: 'sunday-lunch', ...(c.args[0] as object) }, error: null }),
    });
    const res = await PUT(req('PUT', { recipe_ids: [R1, R2] }, auth), ctx());
    expect(res.status).toBe(200);
    const patch = fake.calls.find(c => c.verb === 'update')!.args[0] as Record<string, unknown>;
    expect(patch.recipe_ids).toEqual([R1, R2]);
    expect(patch.shopping_list).toEqual([
      { aisle: 'Pantry', aisle_es: 'Despensa', items: [{ name: 'Rice', name_es: null, qty: '2 cup', qty_es: '2 taza' }] },
    ]);
  });

  it('keeps the saved shopping list when recipes are only re-ordered', async () => {
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: { id: ID, slug: 's', recipe_ids: [R1, R2] }, error: null }),
      'recipes.select': () => ({ data: [{ id: R1, ingredients: [], ingredients_es: null }, { id: R2, ingredients: [], ingredients_es: null }], error: null }),
      'meal_groups.update': c => ({ data: { id: ID, slug: 's', ...(c.args[0] as object) }, error: null }),
    });
    await PUT(req('PUT', { recipe_ids: [R2, R1] }, auth), ctx());
    const patch = fake.calls.find(c => c.verb === 'update')!.args[0] as Record<string, unknown>;
    expect(patch).toEqual({ recipe_ids: [R2, R1] });
  });

  it('409 on a slug clash', async () => {
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: { id: ID, slug: 's', recipe_ids: [R1] }, error: null }),
      'meal_groups.update': () => ({ data: null, error: { message: 'duplicate key', code: '23505' } }),
    });
    expect((await PUT(req('PUT', { slug: 'taken' }, auth), ctx())).status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/meals/[id]', () => {
  it('404 when the meal does not exist', async () => {
    fake = makeFakeSupabase({ 'meal_groups.select': () => ({ data: null, error: null }) });
    expect((await DELETE(req('DELETE', undefined, auth), ctx())).status).toBe(404);
  });

  it('archives the full row FIRST, then deletes, then revalidates', async () => {
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: MEAL_ROW, error: null }),
      'meal_groups_archive.insert': () => ({ data: null, error: null }),
      'meal_groups.delete': () => ({ data: null, error: null }),
    });
    const res = await DELETE(req('DELETE', undefined, auth), ctx());
    expect(res.status).toBe(200);
    const verbs = fake.calls.map(c => `${c.table}.${c.verb}`);
    expect(verbs.indexOf('meal_groups_archive.insert')).toBeGreaterThan(-1);
    expect(verbs.indexOf('meal_groups_archive.insert')).toBeLessThan(verbs.indexOf('meal_groups.delete'));
    const archived = (fake.calls.find(c => c.table === 'meal_groups_archive')!.args[0] as Array<Record<string, unknown>>)[0];
    expect(archived).toMatchObject({ slug: 'sunday-lunch', row: MEAL_ROW });
    expect(typeof archived.reason).toBe('string');
    expect(revalidatePath.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['/en/meals/sunday-lunch', '/es/meals/sunday-lunch', '/en/meals']));
  });

  it('does NOT delete when the archive insert fails', async () => {
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: MEAL_ROW, error: null }),
      'meal_groups_archive.insert': () => ({ data: null, error: { message: 'permission denied' } }),
      'meal_groups.delete': () => ({ data: null, error: null }),
    });
    const res = await DELETE(req('DELETE', undefined, auth), ctx());
    expect(res.status).toBe(500);
    expect(fake.calls.some(c => c.verb === 'delete')).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('keeps an older archive copy when the same slug was archived before (suffixed key)', async () => {
    let n = 0;
    fake = makeFakeSupabase({
      'meal_groups.select': () => ({ data: MEAL_ROW, error: null }),
      'meal_groups_archive.insert': () => (n++ === 0 ? { data: null, error: { message: 'dup', code: '23505' } } : { data: null, error: null }),
      'meal_groups.delete': () => ({ data: null, error: null }),
    });
    expect((await DELETE(req('DELETE', undefined, auth), ctx())).status).toBe(200);
    const slugs = fake.calls.filter(c => c.table === 'meal_groups_archive').map(c => (c.args[0] as Array<{ slug: string }>)[0].slug);
    expect(slugs[0]).toBe('sunday-lunch');
    expect(slugs[1]).toMatch(/^sunday-lunch-\d+$/);
  });
});
