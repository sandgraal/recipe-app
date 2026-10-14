/**
 * Finds recipes whose dietary label contradicts their ingredient list
 * (a "vegan" recipe with butter, a "vegetarian" one with chicken stock...).
 * Pure and deliberately conservative: whole-word, accent-insensitive matching,
 * with exceptions for the look-alikes (coconut milk, peanut butter, eggplant).
 * It points a person at a line to check; it never changes anything.
 */

export type DietaryLabel = 'vegetarian' | 'vegan' | 'dairy-free';

export interface DietaryConflict {
  label: DietaryLabel;
  /** The ingredient line (as written) that triggered it. */
  ingredient: string;
}

/** Lower-case, no accents, single spaces. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Terms are written folded (no accents). Each may be followed by a plural "s"/"es".
const MEAT = [
  'beef', 'pork', 'chicken', 'turkey', 'lamb', 'duck', 'veal', 'bacon', 'ham', 'sausage', 'chorizo', 'pepperoni', 'salami',
  'prosciutto', 'steak', 'ribs', 'fish', 'anchovy', 'anchovies', 'sardine', 'shrimp', 'prawn', 'tuna', 'salmon', 'cod', 'tilapia',
  'crab', 'lobster', 'squid', 'calamari', 'octopus', 'oyster', 'clam', 'mussel', 'worcestershire', 'gelatin', 'gelatine', 'lard',
  'tallow', 'suet', 'bone broth', 'fish sauce',
  // Spanish
  'res', 'cerdo', 'pollo', 'pavo', 'cordero', 'pato', 'ternera', 'tocino', 'jamon', 'salchicha', 'salchichon', 'chicharron',
  'pescado', 'anchoa', 'sardina', 'camaron', 'camarones', 'atun', 'salmon', 'corvina', 'tilapia', 'cangrejo', 'langosta', 'calamar', 'pulpo',
  'ostra', 'almeja', 'mejillon', 'mariscos', 'gelatina', 'manteca de cerdo', 'salsa inglesa', 'caldo de pollo', 'caldo de res',
];

const DAIRY = [
  'milk', 'buttermilk', 'butter', 'cheese', 'cream', 'yogurt', 'yoghurt', 'ghee', 'natilla', 'parmesan', 'mozzarella', 'cheddar',
  'feta', 'ricotta', 'mascarpone', 'whey', 'casein', 'custard',
  // Spanish
  'leche', 'mantequilla', 'queso', 'crema', 'yogur', 'yogurt', 'nata', 'requeson', 'parmesano', 'suero de leche',
];

const EGG_HONEY = ['egg', 'yolk', 'honey', 'huevo', 'yema', 'miel', 'clara de huevo'];

// Look-alikes that are NOT the animal product. Removed from the text before matching.
const EXCEPTIONS = [
  /\b(?:coconut|almond|oat|soy|soya|rice|cashew|hazelnut|plant|nut|vegan)\s+(?:milk|cream|yogurt|yoghurt|cheese|butter)\b/g,
  /\b(?:peanut|almond|cashew|nut|sunflower|seed|apple|cocoa|cacao|shea|tahini)\s+butter\b/g,
  /\bcream of (?:tartar|coconut)\b/g,
  /\b(?:leche|crema|yogur|yogurt|queso|mantequilla|manteca)\s+(?:de|vegetal de)\s+(?:coco|almendras?|avena|soya|soja|arroz|marañon|maranon|mani|cacahuate|cacao|nueces|semillas?)\b/g,
  /\bcrema de tartaro\b/g,
  /\bmiel de (?:maple|arce|agave|palma|cana|caña)\b/g,
  /\b(?:egg|huevo)[- ]?(?:free|less|replacer|substitute|sustituto)\b/g,
  /\bsin (?:huevo|leche|lacteos?)\b/g,
];

// "vegetable or chicken broth": the line offers a vegetarian way to make it.
const OR_WORD = /\b(?:or|o|ou)\b|\//;
const VEG_ALTERNATIVE = /\b(?:vegetables?|veggie|vegetarian|vegan|mushrooms?|tofu|tempeh|seitan|plant|verduras?|vegetal(?:es)?|vegetariano|hongos?|champinones?)\b/;

function termRegex(terms: string[]): RegExp {
  const body = terms
    .map(t => t.split(' ').join('\\s+'))
    .sort((a, b) => b.length - a.length)
    .join('|');
  return new RegExp(`\\b(?:${body})(?:s|es)?\\b`);
}

const MEAT_RE = termRegex(MEAT);
const DAIRY_RE = termRegex(DAIRY);
const EGG_HONEY_RE = termRegex(EGG_HONEY);

function withoutExceptions(folded: string): string {
  let out = folded;
  for (const re of EXCEPTIONS) out = out.replace(re, ' ');
  return out;
}

function hasAnimalMeat(folded: string): boolean {
  const text = withoutExceptions(folded);
  if (!MEAT_RE.test(text)) return false;
  return !(OR_WORD.test(text) && VEG_ALTERNATIVE.test(text));
}

function hasDairy(folded: string): boolean {
  return DAIRY_RE.test(withoutExceptions(folded));
}

function hasEggOrHoney(folded: string): boolean {
  return EGG_HONEY_RE.test(withoutExceptions(folded));
}

/** The text of an ingredient entry: its name plus notes, whatever shape the row has. */
export function ingredientText(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return '';
  const e = entry as { item?: unknown; notes?: unknown };
  return [e.item, e.notes].filter((x): x is string => typeof x === 'string').join(' ');
}

/**
 * Conflicts between the dietary flags and the ingredient lines. `lines` can hold
 * both the English and Spanish ingredient entries. One conflict per label and line.
 */
export function dietaryConflicts(dietary: string[] | null | undefined, lines: unknown[]): DietaryConflict[] {
  const flags = new Set((dietary ?? []).map(d => fold(String(d))));
  const vegan = flags.has('vegan');
  const vegetarian = flags.has('vegetarian');
  const dairyFree = flags.has('dairy-free') || flags.has('dairy free');
  if (!vegan && !vegetarian && !dairyFree) return [];

  const out: DietaryConflict[] = [];
  const seen = new Set<string>();
  const add = (label: DietaryLabel, ingredient: string) => {
    const key = `${label}|${fold(ingredient)}`;
    if (!seen.has(key)) { seen.add(key); out.push({ label, ingredient }); }
  };

  for (const entry of lines) {
    const raw = ingredientText(entry).trim();
    if (!raw) continue;
    const text = fold(raw);
    if (vegan || vegetarian) {
      if (hasAnimalMeat(text)) add(vegan ? 'vegan' : 'vegetarian', raw);
    }
    if (vegan && (hasDairy(text) || hasEggOrHoney(text))) add('vegan', raw);
    if (dairyFree && hasDairy(text)) add('dairy-free', raw);
  }
  return out;
}
