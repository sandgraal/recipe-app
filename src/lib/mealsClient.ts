import type { TranslationKey } from '@/lib/i18n';
import { isValidSlug } from '@/lib/meals';

/**
 * The browser side of meal administration, kept free of React so it can be unit
 * tested with a fake `fetch` (no network, no database). MealForm and
 * MealDeleteDialog call these and only render the result.
 */

export interface MealDraft {
  title: string;
  title_es: string;
  note: string;
  note_es: string;
  slug: string;
  recipeIds: string[];
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type MealSaveResult =
  | { ok: true; slug: string }
  | { ok: false; errorKey: TranslationKey };

export type MealDeleteResult =
  | { ok: true }
  | { ok: false; errorKey: TranslationKey };

/** The error to show for a draft that must not be sent, or null when it can be saved. */
export function validateMealDraft(d: MealDraft): TranslationKey | null {
  if (!d.title.trim()) return 'meal_need_title';
  if (!d.recipeIds.length) return 'meal_need_recipe';
  const slug = d.slug.trim();
  if (slug && !isValidSlug(slug)) return 'meal_field_slug_hint';
  return null;
}

/** The JSON body for POST/PUT /api/meals. A blank slug is left out so the server makes one from the title. */
export function mealRequestBody(d: MealDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: d.title.trim(), title_es: d.title_es, note: d.note, note_es: d.note_es, recipe_ids: d.recipeIds,
  };
  const slug = d.slug.trim();
  if (slug) body.slug = slug;
  return body;
}

/** Create (no `editId`) or update (with `editId`) a meal. Never throws: failures come back as an error key. */
export async function saveMeal(
  draft: MealDraft,
  editId: string | undefined,
  adminHeaders: Record<string, string> = {},
  doFetch: FetchLike = (u, i) => fetch(u, i),
): Promise<MealSaveResult> {
  const invalid = validateMealDraft(draft);
  if (invalid) return { ok: false, errorKey: invalid };
  try {
    const res = await doFetch(editId ? `/api/meals/${editId}` : '/api/meals', {
      method: editId ? 'PUT' : 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify(mealRequestBody(draft)),
    });
    if (!res.ok) {
      return {
        ok: false,
        errorKey: res.status === 409 ? 'meal_slug_taken' : res.status === 401 ? 'meal_save_unauthorized' : 'meal_save_failed',
      };
    }
    const { meal } = await res.json().catch(() => ({})) as { meal?: { slug?: string } };
    return { ok: true, slug: meal?.slug || draft.slug.trim() };
  } catch (err) {
    console.error('meal save failed', err);
    return { ok: false, errorKey: 'meal_save_failed_conn' };
  }
}

/** Delete a meal. Never throws: failures come back as an error key. */
export async function deleteMeal(
  id: string,
  adminHeaders: Record<string, string> = {},
  doFetch: FetchLike = (u, i) => fetch(u, i),
): Promise<MealDeleteResult> {
  try {
    const res = await doFetch(`/api/meals/${id}`, { method: 'DELETE', cache: 'no-store', headers: { ...adminHeaders } });
    if (!res.ok) return { ok: false, errorKey: res.status === 401 ? 'meal_save_unauthorized' : 'meal_delete_failed' };
    return { ok: true };
  } catch (err) {
    console.error('meal delete request failed', err);
    return { ok: false, errorKey: 'meal_delete_failed_conn' };
  }
}
