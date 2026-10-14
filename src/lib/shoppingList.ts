import type { Ingredient, IngredientTranslation, ShoppingAisle, ShoppingItem } from '@/lib/types';
import { localizeUnit } from '@/lib/i18n';

/**
 * Builds a meal's consolidated shopping list from its recipes' ingredients.
 *
 * Output is the SAME shape the meal page already renders (meal_groups.shopping_list):
 *   [{ aisle, aisle_es, items: [{ name, name_es, qty, qty_es }] }]
 *
 * Deliberately conservative: it only merges lines that have the same (case- and
 * accent-insensitive) name, and only adds up quantities that share a unit. Anything
 * it cannot parse stays as text ("to taste"), and anything it cannot place in an
 * aisle goes to "Other". It never invents or drops an ingredient.
 */

export interface RecipeIngredients {
  ingredients?: Array<Pick<Ingredient, 'item' | 'amount' | 'unit'> | null> | null;
  ingredients_es?: Array<Pick<IngredientTranslation, 'item'> | null> | null;
}

interface Aisle { key: string; en: string; es: string }

// Display order of the aisles; "other" is always last. Names match the lists already in meal_groups.shopping_list.
const AISLES: Aisle[] = [
  { key: 'produce', en: 'Produce', es: 'Frutas y Verduras' },
  { key: 'meat', en: 'Meat & Seafood', es: 'Carnes y Mariscos' },
  { key: 'dairy', en: 'Dairy & Eggs', es: 'Lácteos y Huevos' },
  { key: 'bakery', en: 'Bakery', es: 'Panadería' },
  { key: 'pantry', en: 'Pantry', es: 'Despensa' },
  { key: 'spices', en: 'Spices', es: 'Especias' },
  { key: 'sauces', en: 'Sauces & Condiments', es: 'Salsas y Aderezos' },
  { key: 'drinks', en: 'Drinks', es: 'Bebidas' },
  { key: 'other', en: 'Other', es: 'Otros' },
];

// First matching rule wins, so the specific ones (coconut milk, garlic powder,
// chicken broth ...) come before the general ones (milk, garlic, chicken ...).
// Patterns are matched against the accent-stripped, lower-cased English + Spanish name.
const RULES: Array<[string, RegExp]> = [
  ['spices', /\b(garlic powder|onion powder|chili powder|chile powder|curry powder|ajo en polvo|cebolla en polvo|chile en polvo|curry|salt|sal|pepper flakes|black pepper|white pepper|pimienta|cumin|comino|paprika|paprica|oregano|turmeric|curcuma|cinnamon|canela|nutmeg|nuez moscada|cloves|clavos?|cardamom|cardamomo|bay leaves|bay leaf|laurel|vanilla|vainilla|seasoning|sazonador|spice|especias?|achiote|annatto|allspice)\b/],
  ['drinks', /\b(wine|vino|beer|cerveza|rum|ron|guaro|soda|water|agua|coffee|cafe|tea|sparkling)\b/],
  ['sauces', /\b(sauce|salsa|ketchup|catsup|mustard|mostaza|mayonnaise|mayo|mayonesa|vinegar|vinagre|lizano|worcestershire|dressing|aderezo|pesto|tahini|hummus)\b/],
  ['pantry', /\b(coconut milk|leche de coco|coconut cream|crema de coco|broth|stock|caldo|bouillon|consome|rice|arroz|beans?|frijoles?|lentils?|lentejas?|chickpeas?|garbanzos?|flour|harina|sugar|azucar|honey|miel|syrup|sirope|molasses|panela|tapa de dulce|oil|aceite|pasta|spaghetti|noodles?|fideos?|oats?|avena|cornmeal|masa|canned|enlatad[oa]s?|tomato paste|pasta de tomate|baking powder|baking soda|polvo de hornear|bicarbonato|cornstarch|maicena|cocoa|cacao|chocolate|peanut butter|mantequilla de mani|nuts?|almonds?|almendras?|walnuts?|nueces|peanuts?|mani|cashews?|raisins?|pasas|coconut|coco|seeds?|semillas?|breadcrumbs|pan molido|olives?|aceitunas?|capers?|alcaparras?|dried)\b/],
  ['dairy', /\b(milk|leche|cream|crema|natilla|butter|mantequilla|cheese|queso|yogurt|yoghurt|yogur|eggs?|huevos?|cuajada|margarine|margarina)\b/],
  ['bakery', /\b(bread|pan|tortillas?|buns?|rolls?|bagels?|pita|baguette|bizcocho|brioche)\b/],
  ['meat', /\b(chicken|pollo|beef|res|carne|pork|cerdo|chancho|bacon|tocino|ham|jamon|sausages?|chorizo|salchichas?|turkey|pavo|lamb|cordero|fish|pescado|salmon|tuna|atun|shrimp|camarones?|prawns?|seafood|mariscos?|snapper|pargo|tilapia|corvina|mahi|squid|calamar|ribs|costillas?|steak|filet|filete|mince)\b/],
  ['produce', /\b(tomato(es)?|tomates?|onions?|cebollas?|garlic|ajo|potato(es)?|papas?|cilantro|culantro|parsley|perejil|basil|albahaca|mint|menta|thyme|tomillo|rosemary|romero|lettuce|lechuga|cabbage|repollo|carrots?|zanahorias?|celery|apio|peppers?|chiles?|chilis?|chillies|chayote|cucumbers?|pepino|zucchini|calabacin|squash|ayote|pumpkin|zapallo|spinach|espinaca|kale|broccoli|brocoli|cauliflower|coliflor|corn|elote|maiz|mushrooms?|hongos?|champinones?|plantains?|platano|bananas?|yuca|cassava|name|tiquisque|camote|sweet potato|ginger|jengibre|lemons?|limon(es)?|limes?|oranges?|naranjas?|apples?|manzanas?|pineapple|pina|mango|papaya|avocados?|aguacates?|berries|fresas?|strawberr(y|ies)|watermelon|sandia|melon|grapes?|uvas?|greens|verduras?|vegetables?|fruits?|frutas?|scallions?|green onions?|cebollino|chives|leeks?|puerro|beets?|remolacha|radish|rabano|asparagus|esparragos?|peas?|arvejas?|guisantes?|green beans|vainicas?|ejotes?|eggplant|berenjena|fresh)\b/],
];

/** lower-case, strip accents, collapse whitespace. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function aisleKeyFor(name: string, nameEs?: string | null): string {
  const hay = normalizeName(`${name} ${nameEs ?? ''}`);
  for (const [key, re] of RULES) if (re.test(hay)) return key;
  return 'other';
}

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

/**
 * "2", "1.5", "1/2", "1 1/2", "1½", "½", "2-3" (takes the upper bound so we never
 * under-buy). Returns null when it is not a plain amount ("to taste", "a pinch").
 */
export function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/(\d),(\d)/g, '$1.$2');
  if (!s) return null;
  const range = s.match(/^(.+?)\s*(?:-|–|—)\s*(.+)$/);
  if (range) {
    const lo = parseAmount(range[1]);
    const hi = parseAmount(range[2]);
    return lo !== null && hi !== null ? Math.max(lo, hi) : null;
  }
  for (const [g, v] of Object.entries(FRACTIONS)) s = s.replace(g, ` ${v} `);
  const parts = s.split(/\s+/).filter(Boolean);
  if (!parts.length || parts.length > 2) return null;
  let total = 0;
  for (const p of parts) {
    const frac = p.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      const d = Number(frac[2]);
      if (!d) return null;
      total += Number(frac[1]) / d;
    } else if (/^\d+(\.\d+)?$/.test(p)) {
      total += Number(p);
    } else {
      return null;
    }
  }
  return total > 0 ? total : null;
}

const GLYPHS: Array<[number, string]> = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];

export function formatAmount(n: number): string {
  const whole = Math.floor(n + 0.02);
  const frac = n - whole;
  if (Math.abs(frac) < 0.02) return String(whole);
  for (const [v, g] of GLYPHS) {
    if (Math.abs(frac - v) < 0.02) return whole ? `${whole}${g}` : g;
  }
  return String(Math.round(n * 100) / 100);
}

interface Acc {
  name: string;
  nameEs: string | null;
  aisle: string;
  sums: Map<string, { unit: string; total: number }>; // by normalized unit
  texts: string[]; // quantities we could not add up
}

function fmtQty(unit: string, total: number, lang: 'en' | 'es'): string {
  const u = lang === 'es' ? localizeUnit(unit, 'es') : unit;
  return `${formatAmount(total)}${u ? ` ${u}` : ''}`;
}

export function buildShoppingList(recipes: RecipeIngredients[]): ShoppingAisle[] {
  const acc = new Map<string, Acc>(); // key = normalized english name
  for (const r of recipes) {
    const list = Array.isArray(r.ingredients) ? r.ingredients : [];
    list.forEach((ing, i) => {
      const name = (ing?.item ?? '').trim();
      if (!name) return;
      const es = (Array.isArray(r.ingredients_es) ? r.ingredients_es[i]?.item : null)?.trim() || null;
      const key = normalizeName(name);
      let a = acc.get(key);
      if (!a) {
        a = { name, nameEs: es, aisle: aisleKeyFor(name, es), sums: new Map(), texts: [] };
        acc.set(key, a);
      } else if (!a.nameEs && es) {
        a.nameEs = es;
      }
      const amount = (ing?.amount ?? '').trim();
      const unit = (ing?.unit ?? '').trim();
      const n = parseAmount(amount);
      if (n !== null) {
        const uk = normalizeName(unit);
        const cur = a.sums.get(uk);
        if (cur) cur.total += n;
        else a.sums.set(uk, { unit, total: n });
      } else if (amount || unit) {
        const text = [amount, unit].filter(Boolean).join(' ');
        if (!a.texts.includes(text)) a.texts.push(text);
      }
    });
  }

  const byAisle = new Map<string, ShoppingItem[]>();
  for (const a of acc.values()) {
    const sums = [...a.sums.values()];
    const qty = [...sums.map(s => fmtQty(s.unit, s.total, 'en')), ...a.texts].join(' + ');
    const qtyEs = [...sums.map(s => fmtQty(s.unit, s.total, 'es')), ...a.texts].join(' + ');
    const item: ShoppingItem = { name: a.name, name_es: a.nameEs, qty: qty || null, qty_es: qtyEs || null };
    const bucket = byAisle.get(a.aisle) ?? [];
    bucket.push(item);
    byAisle.set(a.aisle, bucket);
  }

  return AISLES.filter(a => byAisle.has(a.key)).map(a => ({
    aisle: a.en,
    aisle_es: a.es,
    items: byAisle.get(a.key)!.sort((x, y) => x.name.localeCompare(y.name)),
  }));
}
