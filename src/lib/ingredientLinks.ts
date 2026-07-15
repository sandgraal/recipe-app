// Auto-links an ingredient's text to the app's own recipe for that
// ingredient when one exists (e.g. an ingredient that says "ketchup" links to
// the "Ketchup (Classic Homemade)" recipe). Candidates are recipes tagged as
// reusable condiments/sauces/ferments, plus a short manual allow-list for
// staples that don't carry one of those tags (rice, bread). This is a
// curated, best-effort list — extend RULES/EXTRA_TITLES as new "ingredient
// recipes" get added to the catalog.

export interface IngredientRecipeCandidate {
  id: string;
  title: string;
  title_es?: string | null;
}

const CONDIMENT_TAGS = new Set(['Condiments', 'Condiment', 'Sauces', 'Preserves', 'Fermented']);
const EXTRA_TITLES = new Set(['Steamed White Rice', 'Pita Bread']);

export function isIngredientRecipe(recipe: { title: string; tags?: string[] | null }): boolean {
  return EXTRA_TITLES.has(recipe.title) || (recipe.tags ?? []).some(tag => CONDIMENT_TAGS.has(tag));
}

/** Given all recipe cards, return the subset eligible to be linked from
 *  another recipe's ingredient list (excluding the current recipe itself). */
export function getIngredientLinkCandidates<T extends { id: string; title: string; tags?: string[] | null }>(
  allCards: T[],
  excludeRecipeId: string,
): IngredientRecipeCandidate[] {
  return allCards
    .filter(c => c.id !== excludeRecipeId && isIngredientRecipe(c))
    .map(c => ({ id: c.id, title: c.title, title_es: (c as { title_es?: string | null }).title_es ?? null }));
}

// Phrases (English and known Spanish translations — auto-translation isn't
// consistent recipe-to-recipe, e.g. "ketchup" comes back as "catsup" on some
// recipes) -> the exact recipe title(s) they link to. A rule with more than
// one title is a generic/ambiguous term (e.g. "hot sauce") that matches
// several distinct recipes — rendered as a "see: A, B, C" list instead of a
// single inline link. More specific phrases are listed first since matching
// stops at the first hit.
const RULES: { phrases: string[]; titles: string[] }[] = [
  { phrases: ['salsa lizano'], titles: ['Salsa Lizano-Style Sauce'] },
  { phrases: ['pico de gallo'], titles: ['Pico de Gallo'] },
  { phrases: ['peanut sauce', 'salsa de maní', 'salsa de cacahuate'], titles: ['Peanut Sauce (Thai-Style)'] },
  { phrases: ['mango chutney', 'chutney de mango'], titles: ['Fermented Mango Chutney'] },
  { phrases: ['garlic honey', 'miel de ajo'], titles: ['Fermented Garlic Honey'] },
  { phrases: ['preserved lemon', 'limón encurtido', 'limones encurtidos', 'limones en conserva'], titles: ['Preserved Lemons'] },
  { phrases: ['black garlic', 'ajo negro'], titles: ['Black Garlic'] },
  { phrases: ['chili crisp'], titles: ['Sichuan-Style Chili Crisp'] },
  { phrases: ['sourdough', 'masa madre'], titles: ['Sourdough Starter + Base Loaf'] },
  {
    phrases: ['hot sauce', 'salsa picante'],
    titles: [
      'Chipotle Adobo-Style Smoky Hot Sauce',
      'Cholula-Style Sweet Habanero Hot Sauce',
      'Secret Aardvark-Style Habanero Hot Sauce',
      'Tropical Amarillo-Style Hot Sauce',
      'True Lacto-Fermented Hot Sauce',
    ],
  },
  { phrases: ['mayonnaise', 'mayonesa'], titles: ['Mayonnaise (Classic)'] },
  { phrases: ['mayo'], titles: ['Mayonnaise (Classic)'] },
  { phrases: ['ketchup', 'catsup', 'kétchup', 'cátsup'], titles: ['Ketchup (Classic Homemade)'] },
  { phrases: ['natilla'], titles: ['Natilla (Costa Rican Sour Cream)'] },
  { phrases: ['tzatziki'], titles: ['Tzatziki'] },
  { phrases: ['pita'], titles: ['Pita Bread'] },
  { phrases: ['chimichurri'], titles: ['Chimichurri'] },
  { phrases: ['kimchi'], titles: ['Kimchi (Traditional Napa Cabbage)'] },
  { phrases: ['sauerkraut', 'chucrut'], titles: ['Sauerkraut'] },
  { phrases: ['curtido'], titles: ['Curtido'] },
  { phrases: ['kombucha'], titles: ['Kombucha'] },
  { phrases: ['tepache'], titles: ['Tepache'] },
  { phrases: ['white rice', 'cooked rice', 'steamed rice', 'arroz blanco', 'arroz cocido', 'arroz al vapor'], titles: ['Steamed White Rice'] },
];

export interface IngredientMatch {
  /** exact substring of the input text that matched (for inline highlighting) */
  matchedText: string;
  recipes: IngredientRecipeCandidate[];
}

/** Find a linkable phrase in a single piece of ingredient text (the `item`
 *  or the `notes`, checked separately by the caller). Returns null if no
 *  rule matches, or if the only candidate(s) it would resolve to aren't in
 *  this recipe's candidate list (e.g. filtered out as self-referencing). */
export function findIngredientLink(
  text: string,
  candidates: IngredientRecipeCandidate[],
  excludeRecipeId: string,
): IngredientMatch | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const rule of RULES) {
    let idx = -1;
    let matchedPhrase = '';
    for (const phrase of rule.phrases) {
      const i = lower.indexOf(phrase);
      if (i !== -1) { idx = i; matchedPhrase = phrase; break; }
    }
    if (idx === -1) continue;
    const recipes = rule.titles
      .map(title => candidates.find(c => c.title === title))
      .filter((c): c is IngredientRecipeCandidate => !!c && c.id !== excludeRecipeId);
    if (recipes.length > 0) {
      return { matchedText: text.slice(idx, idx + matchedPhrase.length), recipes };
    }
  }
  return null;
}
