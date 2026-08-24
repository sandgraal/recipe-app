import { Recipe } from '@/lib/types';
import {
  recipeTitle, recipeDescription, recipeSteps, recipeIngredientItem,
  localizeUnit, localizeCuisine, localizeRecipeCategory, recipeTags, type Locale,
} from '@/lib/i18n';
import { isoFromMinutes, parseMinutes } from '@/lib/time';
import { SITE_NAME } from '@/lib/site';

// schema.org RestrictedDiet URLs for the dietary flags that have a canonical
// value (pescatarian/keto have none in schema.org, so they're omitted).
const DIET_SCHEMA_URL: Record<string, string> = {
  vegetarian: 'https://schema.org/VegetarianDiet',
  vegan: 'https://schema.org/VeganDiet',
  'gluten-free': 'https://schema.org/GlutenFreeDiet',
  'dairy-free': 'https://schema.org/LowLactoseDiet',
};

/** Total time as ISO-8601: prefer the numeric minutes, fall back to the string. */
function isoTotal(recipe: Recipe): string | undefined {
  return isoFromMinutes(recipe.total_time_min ?? parseMinutes(recipe.total_time));
}

/**
 * schema.org Recipe JSON-LD for rich results + AI answer-engine visibility.
 * Server-rendered into the page head so crawlers see structured recipe data.
 */
export default function RecipeSchema({ recipe, lang }: { recipe: Recipe; lang: Locale }) {
  const ingredients = (recipe.ingredients || [])
    .map((ing, i) => {
      const tr = recipeIngredientItem(recipe, i, lang);
      return [ing.amount, localizeUnit(ing.unit, lang), tr.item].filter(Boolean).join(' ').trim();
    })
    .filter(Boolean);

  const steps = recipeSteps(recipe, lang).slice().sort((a, b) => a.order - b.order);
  const images = [recipe.image_url, ...(recipe.gallery_images || [])].filter((u): u is string => !!u);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipeTitle(recipe, lang),
    description: recipeDescription(recipe, lang) || undefined,
    image: images.length ? images : undefined,
    author: { '@type': 'Organization', name: SITE_NAME },
    inLanguage: lang,
    recipeCuisine: recipe.cuisine ? localizeCuisine(recipe.cuisine, lang) : undefined,
    recipeCategory: recipe.category ? localizeRecipeCategory(recipe.category, lang) : undefined,
    keywords: recipeTags(recipe, lang).join(', ') || undefined,
    prepTime: isoFromMinutes(recipe.prep_time_min),
    cookTime: isoFromMinutes(recipe.cook_time_min),
    totalTime: isoTotal(recipe),
    suitableForDiet: (() => {
      const urls = (recipe.dietary || [])
        .map(d => DIET_SCHEMA_URL[d.trim().toLowerCase()])
        .filter((u): u is string => !!u);
      return urls.length ? urls : undefined;
    })(),
    recipeYield: recipe.servings ? String(recipe.servings) : undefined,
    recipeIngredient: ingredients.length ? ingredients : undefined,
    recipeInstructions: steps.length
      ? steps.map(s => ({ '@type': 'HowToStep', position: s.order, text: s.text }))
      : undefined,
    datePublished: recipe.created_at || undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
