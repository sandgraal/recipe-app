/**
 * JSON Schemas for `output_config.format` (structured outputs). They replace
 * the old "return ONLY JSON" instruction and the regex that dug it out. Rules
 * of the feature: every object has `additionalProperties: false` and lists all
 * its properties as required; no length or range keywords. A value that may be
 * missing is `anyOf` string/null, as the routes already treated it.
 */

const nullable = (type: 'string' | 'number') => ({ anyOf: [{ type }, { type: 'null' }] });

const stringArray = { type: 'array', items: { type: 'string' } } as const;

/** The recipe shape of the import routes (matches what POST /api/recipes validates). */
export const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: nullable('string'),
    servings: nullable('number'),
    total_time: nullable('string'),
    cuisine: nullable('string'),
    tags: stringArray,
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          amount: { type: 'string' },
          unit: { type: 'string' },
          item: { type: 'string' },
          notes: nullable('string'),
        },
        required: ['amount', 'unit', 'item', 'notes'],
        additionalProperties: false,
      },
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: { order: { type: 'integer' }, text: { type: 'string' } },
        required: ['order', 'text'],
        additionalProperties: false,
      },
    },
    notes: nullable('string'),
  },
  required: ['title', 'description', 'servings', 'total_time', 'cuisine', 'tags', 'ingredients', 'steps', 'notes'],
  additionalProperties: false,
} as const;

/** Step 1 of /api/identify: what is in the photo. */
export const IDENTIFY_SCHEMA = {
  type: 'object',
  properties: { ingredients: stringArray, search_terms: stringArray },
  required: ['ingredients', 'search_terms'],
  additionalProperties: false,
} as const;

/** Step 2 of /api/identify: collection matches and new ideas. */
export const SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    matching_recipe_ids: stringArray,
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          key_steps: stringArray,
        },
        required: ['title', 'description', 'key_steps'],
        additionalProperties: false,
      },
    },
  },
  required: ['matching_recipe_ids', 'suggestions'],
  additionalProperties: false,
} as const;

/** The Spanish fields of a translated recipe (lib/translate.ts). */
export const TRANSLATION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    notes: { type: 'string' },
    tags: stringArray,
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: { item: { type: 'string' }, notes: { type: 'string' } },
        required: ['item', 'notes'],
        additionalProperties: false,
      },
    },
    steps: stringArray,
  },
  required: ['title', 'description', 'notes', 'tags', 'ingredients', 'steps'],
  additionalProperties: false,
} as const;
