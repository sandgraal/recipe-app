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

export type RecipeCardData = Pick<
  Recipe,
  'id' | 'title' | 'title_es' | 'image_url' | 'cuisine' | 'tags' | 'tags_es' | 'total_time' | 'servings' | 'created_at'
>;

export type RecipeFormData = Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'title_es' | 'description_es' | 'notes_es' | 'steps_es' | 'ingredients_es' | 'tags_es' | 'translated_at'>;

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
