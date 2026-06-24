export interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  notes?: string;
}

export interface IngredientTranslation {
  item: string;
  notes?: string;
}

export interface Step {
  order: number;
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  servings?: number | null;
  total_time?: string | null;
  cuisine?: string | null;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  notes?: string | null;
  image_url?: string | null;
  gallery_images?: string[];
  source_url?: string | null;
  source_type: 'manual' | 'url' | 'text' | 'photo' | 'chat';
  created_at: string;
  updated_at: string;
  // Spanish translations (auto-generated)
  title_es?: string | null;
  description_es?: string | null;
  notes_es?: string | null;
  steps_es?: Step[] | null;
  ingredients_es?: IngredientTranslation[] | null;
  tags_es?: string[] | null;
  translated_at?: string | null;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'title_es' | 'description_es' | 'notes_es' | 'steps_es' | 'ingredients_es' | 'tags_es' | 'translated_at'>;

export interface MealGroupSibling {
  id: string;
  title: string;
  title_es?: string | null;
  image_url?: string | null;
}

/** A curated set of recipes meant to be made/served together, with a shared
 *  timing/coordination note. `siblings` are the OTHER recipes in the group. */
export interface MealGroup {
  id: string;
  slug?: string | null;
  title: string;
  title_es?: string | null;
  note?: string | null;
  note_es?: string | null;
  siblings: MealGroupSibling[];
}

/** One line of a consolidated meal shopping list. Bilingual; qty is free text. */
export interface ShoppingItem {
  name: string;
  name_es?: string | null;
  qty?: string | null;
  qty_es?: string | null;
}

/** A store-aisle group within a meal's consolidated shopping list. */
export interface ShoppingAisle {
  aisle: string;
  aisle_es?: string | null;
  items: ShoppingItem[];
}

/** A full meal: the group + its member recipes + the consolidated shopping list. */
export interface Meal {
  id: string;
  slug: string;
  title: string;
  title_es?: string | null;
  note?: string | null;
  note_es?: string | null;
  recipes: MealGroupSibling[];
  shoppingList: ShoppingAisle[];
}

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
