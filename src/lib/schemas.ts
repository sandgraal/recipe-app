import { z } from 'zod';
import { isValidSlug } from '@/lib/meals';

/**
 * Server-side validation for recipe writes (POST /api/recipes, PUT /api/recipes/[id]).
 *
 * The security goal is column-injection defense: the route handlers spread the
 * request body straight into Supabase insert/update, so without this a client
 * could set arbitrary `recipes` columns (id, created_at, or anything else).
 * A top-level `z.object` STRIPS unknown keys by default, so only the fields
 * declared here survive — id/created_at/updated_at and any junk are dropped.
 *
 * Leniency is deliberate: this must never reject a legitimate write (the
 * publish skill, the in-app editor, or an import-then-save). Fields are
 * optional/nullable and lightly typed; the nested ingredient/step objects use
 * `looseObject` (keep unknown keys) because they live inside JSONB columns,
 * where extra keys are stored data, not an injection vector.
 */

// Nested objects live inside JSONB columns — they are stored content, not an
// injection vector, so every field is optional+nullable (real data has
// `notes: null`) and `looseObject` keeps any extra keys. The validation that
// matters (stripping unknown top-level columns) happens on the recipe object.
const ingredientSchema = z.looseObject({
  item: z.string().nullish(),
  amount: z.string().nullish(),
  unit: z.string().nullish(),
  notes: z.string().nullish(),
});

const ingredientEsSchema = z.looseObject({
  item: z.string().nullish(),
  notes: z.string().nullish(),
});

const stepSchema = z.looseObject({
  order: z.coerce.number().nullish(),
  text: z.string().nullish(),
});

// The complete set of client-writable columns. Anything not listed is stripped.
const writeShape = {
  title: z.string().min(1),
  description: z.string().nullish(),
  servings: z.coerce.number().nullish(),
  total_time: z.string().nullish(),
  cuisine: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  // Structured taxonomy columns. Lightly typed on purpose (DB CHECK constraints
  // enforce the controlled vocab for category/difficulty); the point here is to
  // let these real columns survive the unknown-key strip, not to re-validate.
  category: z.string().nullish(),
  region: z.string().nullish(),
  dietary: z.array(z.string()).nullish(),
  difficulty: z.string().nullish(),
  // Stored as Postgres integers — reject floats/negatives here so a bad value
  // fails validation (422) instead of erroring at the DB or corrupting JSON-LD.
  prep_time_min: z.coerce.number().int().nonnegative().nullish(),
  cook_time_min: z.coerce.number().int().nonnegative().nullish(),
  total_time_min: z.coerce.number().int().nonnegative().nullish(),
  ingredients: z.array(ingredientSchema).nullish(),
  steps: z.array(stepSchema).nullish(),
  notes: z.string().nullish(),
  image_url: z.string().nullish(),
  image_thumbhash: z.string().nullish(),
  gallery_images: z.array(z.string()).nullish(),
  source_url: z.string().nullish(),
  source_type: z.enum(['manual', 'url', 'text', 'photo', 'chat']).optional(),
  // Spanish columns are real columns. Normally the server fills them via
  // auto-translate, but allow a client to supply them too — never require.
  title_es: z.string().nullish(),
  description_es: z.string().nullish(),
  notes_es: z.string().nullish(),
  steps_es: z.array(stepSchema).nullish(),
  ingredients_es: z.array(ingredientEsSchema).nullish(),
  tags_es: z.array(z.string()).nullish(),
  translated_at: z.string().nullish(),
};

/** New recipe: requires a title; everything else optional. Unknown keys stripped. */
export const recipeCreateSchema = z.object(writeShape);

/** Edit: every field optional (partial update). Unknown keys stripped. */
export const recipeUpdateSchema = z.object(writeShape).partial();

export type RecipeCreateInput = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;

// ── Meals (meal_groups) ──────────────────────────────────────────────────────
// POST /api/meals and PUT /api/meals/[id]. Same column-injection defence as the
// recipes: only the fields below survive (id, created_at, shopping_list ... are
// dropped — the server builds shopping_list itself from the chosen recipes).

/** "" / whitespace -> null, so a cleared Spanish field is stored as null and the page falls back to English. */
const optionalText = (max: number) =>
  z.string().max(max).nullish().transform(v => (v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim()));

const mealWriteShape = {
  title: z.string().trim().min(1).max(200),
  title_es: optionalText(200),
  note: optionalText(5000),
  note_es: optionalText(5000),
  // Recipe ids are uuids; duplicates are dropped (first position wins); order is the curated order.
  recipe_ids: z
    .array(z.uuid())
    .min(1)
    .max(40)
    .transform(ids => [...new Set(ids)]),
  slug: z.string().trim().refine(isValidSlug, { message: 'slug must be kebab-case (a-z, 0-9, hyphens)' }),
};

/** New meal: title + at least one recipe. `slug` is optional (made from the title). */
export const mealCreateSchema = z.object({ ...mealWriteShape, slug: mealWriteShape.slug.optional() });

/** Edit: every field optional. Unknown keys stripped. */
export const mealUpdateSchema = z.object(mealWriteShape).partial();

export type MealCreateInput = z.infer<typeof mealCreateSchema>;
export type MealUpdateInput = z.infer<typeof mealUpdateSchema>;
