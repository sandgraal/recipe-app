import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveMeal, deleteMeal, validateMealDraft, mealRequestBody, type MealDraft, type FetchLike } from '@/lib/mealsClient';

const draft: MealDraft = {
  title: ' Sunday lunch ', title_es: 'Almuerzo', note: 'n', note_es: 'nota', slug: '', recipeIds: ['a', 'b', 'c'],
};

/** A fake fetch: records the call, answers with the given status/body. No network is ever touched. */
function fakeFetch(status: number, body: unknown = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { fn, calls };
}

afterEach(() => vi.restoreAllMocks());

describe('validateMealDraft', () => {
  it('accepts a complete draft, with or without a slug', () => {
    expect(validateMealDraft(draft)).toBeNull();
    expect(validateMealDraft({ ...draft, slug: 'sunday-lunch' })).toBeNull();
  });
  it('needs a title', () => {
    expect(validateMealDraft({ ...draft, title: '   ' })).toBe('meal_need_title');
  });
  it('needs at least one recipe', () => {
    expect(validateMealDraft({ ...draft, recipeIds: [] })).toBe('meal_need_recipe');
  });
  it('rejects a malformed slug', () => {
    expect(validateMealDraft({ ...draft, slug: 'Bad Slug!' })).toBe('meal_field_slug_hint');
    expect(validateMealDraft({ ...draft, slug: '-x' })).toBe('meal_field_slug_hint');
  });
});

describe('mealRequestBody', () => {
  it('trims the title, keeps the recipe order and leaves a blank slug out', () => {
    expect(mealRequestBody(draft)).toEqual({
      title: 'Sunday lunch', title_es: 'Almuerzo', note: 'n', note_es: 'nota', recipe_ids: ['a', 'b', 'c'],
    });
  });
  it('sends a slug when one is given', () => {
    expect(mealRequestBody({ ...draft, slug: ' sunday-lunch ' })).toMatchObject({ slug: 'sunday-lunch' });
  });
});

describe('saveMeal', () => {
  it('creates with POST /api/meals and returns the slug the server chose', async () => {
    const { fn, calls } = fakeFetch(200, { meal: { slug: 'sunday-lunch' } });
    const r = await saveMeal(draft, undefined, {}, fn);
    expect(r).toEqual({ ok: true, slug: 'sunday-lunch' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/meals');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body)).recipe_ids).toEqual(['a', 'b', 'c']);
  });

  it('edits with PUT /api/meals/:id', async () => {
    const { fn, calls } = fakeFetch(200, { meal: { slug: 'x' } });
    await saveMeal({ ...draft, slug: 'x' }, 'meal-1', { 'X-Test': '1' }, fn);
    expect(calls[0].url).toBe('/api/meals/meal-1');
    expect(calls[0].init?.method).toBe('PUT');
    expect((calls[0].init?.headers as Record<string, string>)['X-Test']).toBe('1');
  });

  it('falls back to the typed slug when the response has no meal', async () => {
    const { fn } = fakeFetch(200, {});
    expect(await saveMeal({ ...draft, slug: 'mine' }, undefined, {}, fn)).toEqual({ ok: true, slug: 'mine' });
  });

  it('does not call the server for an invalid draft', async () => {
    const { fn, calls } = fakeFetch(200);
    const r = await saveMeal({ ...draft, title: '' }, undefined, {}, fn);
    expect(r).toEqual({ ok: false, errorKey: 'meal_need_title' });
    expect(calls).toHaveLength(0);
  });

  it.each([
    [409, 'meal_slug_taken'],
    [401, 'meal_save_unauthorized'],
    [500, 'meal_save_failed'],
    [400, 'meal_save_failed'],
  ])('maps HTTP %i to %s', async (status, key) => {
    const { fn } = fakeFetch(status, { error: 'x' });
    expect(await saveMeal(draft, undefined, {}, fn)).toEqual({ ok: false, errorKey: key });
  });

  it('reports a connection problem when fetch rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing: FetchLike = async () => { throw new TypeError('offline'); };
    expect(await saveMeal(draft, undefined, {}, failing)).toEqual({ ok: false, errorKey: 'meal_save_failed_conn' });
  });
});

describe('deleteMeal', () => {
  it('sends DELETE /api/meals/:id', async () => {
    const { fn, calls } = fakeFetch(200, { ok: true });
    expect(await deleteMeal('meal-9', {}, fn)).toEqual({ ok: true });
    expect(calls[0].url).toBe('/api/meals/meal-9');
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it.each([
    [401, 'meal_save_unauthorized'],
    [404, 'meal_delete_failed'],
    [500, 'meal_delete_failed'],
  ])('maps HTTP %i to %s', async (status, key) => {
    const { fn } = fakeFetch(status);
    expect(await deleteMeal('m', {}, fn)).toEqual({ ok: false, errorKey: key });
  });

  it('reports a connection problem when fetch rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing: FetchLike = async () => { throw new TypeError('offline'); };
    expect(await deleteMeal('m', {}, failing)).toEqual({ ok: false, errorKey: 'meal_delete_failed_conn' });
  });
});
