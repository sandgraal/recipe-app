import { Recipe } from '@/lib/types';
import {
  recipeTitle, recipeDescription, recipeSteps, recipeIngredientItem,
  localizeUnit, localizeCuisine, recipeTags, type Locale,
} from '@/lib/i18n';
import { SITE_NAME } from '@/lib/site';

/** "45 min" / "1 hour 30 min" → ISO-8601 duration (PT1H30M). */
function isoDuration(text?: string | null): string | undefined {
  if (!text) return undefined;
  const h = text.match(/(\d+)\s*(?:h|hr|hour)/i);
  const m = text.match(/(\d+)\s*(?:m|min)/i);
  const hours = h ? parseInt(h[1]) : 0;
  const mins = m ? parseInt(m[1]) : 0;
  if (!hours && !mins) return undefined;
  return `PT${hours ? `${hours}H` : ''}${mins ? `${mins}M` : ''}`;
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
    keywords: recipeTags(recipe, lang).join(', ') || undefined,
    totalTime: isoDuration(recipe.total_time),
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
