'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/lib/types';
import { t, type Locale } from '@/lib/i18n';
import { useAdmin } from '@/lib/useAdmin';

// ─── Pantry data ────────────────────────────────────────────────────────────

const PANTRY_KEY = 'colibri_pantry_v1';

const INGREDIENT_CATEGORIES: Record<string, string[]> = {
  'Proteins': [
    'chicken breast', 'chicken thighs', 'whole chicken', 'ground chicken',
    'ground beef', 'ground turkey', 'ground pork', 'steak', 'beef roast',
    'pork chops', 'pork tenderloin', 'pork shoulder', 'ribs', 'ham',
    'bacon', 'sausage', 'chorizo', 'hot dogs', 'salmon', 'shrimp', 'tuna',
    'cod', 'tilapia', 'corvina', 'white fish', 'crab', 'scallops', 'eggs', 'tofu',
    'tempeh', 'seitan', 'turkey', 'lamb', 'veal', 'deli meat',
  ],
  'Beans & Legumes': [
    'black beans', 'kidney beans', 'pinto beans', 'white beans',
    'cannellini beans', 'navy beans', 'garbanzo beans', 'chickpeas',
    'lentils', 'red lentils', 'green lentils', 'split peas', 'black-eyed peas',
    'lima beans', 'refried beans', 'red beans', 'edamame',
  ],
  'Vegetables': [
    'onion', 'red onion', 'green onion', 'shallot', 'leek', 'garlic',
    'ginger', 'tomato', 'cherry tomatoes', 'bell pepper', 'red pepper',
    'jalapeño', 'serrano', 'poblano', 'chili pepper', 'spinach', 'broccoli',
    'carrot', 'celery', 'zucchini', 'squash', 'butternut squash',
    'mushrooms', 'potato', 'sweet potato', 'cucumber', 'lettuce',
    'romaine', 'arugula', 'kale', 'chard', 'corn', 'green beans', 'peas',
    'snap peas', 'eggplant', 'cauliflower', 'cabbage', 'napa cabbage',
    'brussels sprouts', 'asparagus', 'beets', 'radish', 'turnip',
    'artichoke', 'okra', 'fennel', 'bok choy', 'pumpkin',
    'plantain', 'green plantain', 'yuca', 'cassava', 'chayote',
    'heart of palm', 'taro', 'ayote',
  ],
  'Fruits': [
    'lemon', 'lime', 'orange', 'grapefruit', 'avocado', 'mango', 'apple',
    'pear', 'banana', 'strawberries', 'blueberries', 'raspberries',
    'blackberries', 'grapes', 'pineapple', 'peach', 'plum', 'cherries',
    'watermelon', 'cantaloupe', 'kiwi', 'pomegranate', 'cranberries',
    'raisins', 'dates', 'coconut', 'coconut milk', 'lime juice', 'lemon juice',
    'papaya', 'guava', 'passion fruit', 'soursop', 'tamarind', 'starfruit',
  ],
  'Grains & Pasta': [
    'white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'arborio rice',
    'pasta', 'spaghetti', 'penne', 'macaroni', 'lasagna noodles', 'egg noodles',
    'rice noodles', 'ramen', 'quinoa', 'farro', 'barley', 'bulgur',
    'bread', 'baguette', 'pita', 'naan', 'tortillas', 'corn tortillas',
    'flour', 'all-purpose flour', 'whole wheat flour', 'cornmeal', 'masa harina',
    'bread crumbs', 'panko', 'oats', 'couscous', 'polenta', 'crackers',
  ],
  'Dairy & Eggs': [
    'butter', 'milk', 'whole milk', 'almond milk', 'oat milk',
    'heavy cream', 'half and half', 'sour cream', 'yogurt', 'greek yogurt',
    'cheddar', 'parmesan', 'mozzarella', 'cream cheese', 'feta', 'ricotta',
    'cottage cheese', 'goat cheese', 'swiss cheese', 'monterey jack',
    'queso fresco', 'gruyere', 'blue cheese', 'eggs',
  ],
  'Herbs & Spices': [
    'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'dill', 'mint',
    'cilantro', 'culantro', 'parsley', 'chives', 'tarragon', 'bay leaf',
    'cumin', 'coriander', 'paprika', 'smoked paprika', 'chili powder',
    'cinnamon', 'nutmeg', 'allspice', 'cloves', 'cardamom', 'turmeric',
    'ginger', 'garlic powder', 'onion powder', 'curry powder', 'garam masala',
    'italian seasoning', 'red pepper flakes', 'black pepper', 'white pepper',
    'cayenne', 'chili flakes', 'saffron', 'fennel seeds', 'mustard seeds',
    'sesame seeds', 'vanilla', 'vanilla extract', 'achiote',
  ],
  'Pantry Staples': [
    'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil',
    'salt', 'sea salt', 'sugar', 'brown sugar', 'powdered sugar', 'panela',
    'soy sauce', 'tamari', 'vinegar', 'white vinegar', 'apple cider vinegar',
    'balsamic vinegar', 'rice vinegar', 'red wine vinegar', 'hot sauce',
    'sriracha', 'tomato paste', 'canned tomatoes', 'crushed tomatoes',
    'tomato sauce', 'salsa', 'broth', 'chicken broth', 'beef broth',
    'vegetable broth', 'stock', 'honey', 'maple syrup', 'molasses', 'condensed milk',
    'mustard', 'dijon mustard', 'mayonnaise', 'ketchup', 'bbq sauce',
    'worcestershire sauce', 'salsa lizano', 'fish sauce', 'oyster sauce', 'hoisin sauce',
    'peanut butter', 'tahini', 'cornstarch', 'baking soda', 'baking powder',
    'yeast', 'cocoa powder', 'chocolate chips', 'nuts', 'almonds', 'walnuts',
    'peanuts', 'cashews', 'pine nuts',
  ],
};

const QUICK_STAPLES = [
  'olive oil', 'salt', 'black pepper', 'garlic', 'onion',
  'butter', 'eggs', 'flour', 'sugar', 'soy sauce',
];

const ALL_INGREDIENTS = [...new Set(Object.values(INGREDIENT_CATEGORIES).flat())];

// ─── Scoring ────────────────────────────────────────────────────────────────

function matchScore(recipe: Recipe, pantry: Set<string>, focus?: string): {
  score: number; matched: number; total: number; hasFocus: boolean;
} {
  const total = recipe.ingredients.length;
  if (total === 0) return { score: 0, matched: 0, total: 0, hasFocus: false };

  let matched = 0;
  let hasFocus = false;
  const pantryLower = new Set([...pantry].map(p => p.toLowerCase()));
  const focusLower = focus?.toLowerCase();

  for (const ing of recipe.ingredients) {
    const itemLower = ing.item.toLowerCase();
    const isMatch = [...pantryLower].some(p =>
      itemLower.includes(p) || p.includes(itemLower.split(' ')[0])
    );
    if (isMatch) matched++;
    if (focusLower && (itemLower.includes(focusLower) || focusLower.includes(itemLower))) {
      hasFocus = true;
    }
  }

  const score = total > 0 ? matched / total : 0;
  return { score, matched, total, hasFocus };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PantryChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
      style={{ background: 'rgba(31,138,112,0.12)', color: 'var(--secondary)', border: '1px solid rgba(31,138,112,0.25)' }}
    >
      {label}
      <button onClick={onRemove} className="ml-0.5 leading-none hover:opacity-70" style={{ fontSize: '16px', color: 'var(--muted)' }}>×</button>
    </span>
  );
}

function MatchBadge({ matched, total, hasFocus, lang }: { matched: number; total: number; hasFocus: boolean; lang: Locale }) {
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
  if (pct === 100) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: '#d1fae5', color: '#065f46' }}>
        {t(lang, 'identify_match_badge_full')}
      </span>
    );
  }
  if (pct >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: '#fef3c7', color: '#92400e' }}>
        {pct}% {lang === 'es' ? 'compatib.' : 'match'}
        {hasFocus && ' ★'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
      {pct}%{hasFocus && ' ★'}
    </span>
  );
}

interface RecipeMatchCardProps {
  recipe: Recipe;
  matched: number;
  total: number;
  hasFocus: boolean;
  lang: Locale;
}

function RecipeMatchCard({ recipe, matched, total, hasFocus, lang }: RecipeMatchCardProps) {
  const gradient = [
    'linear-gradient(135deg,#f16745,#f7ba2a)',
    'linear-gradient(135deg,#1f8a70,#a8e6cf)',
    'linear-gradient(135deg,#f7ba2a,#f5deb3)',
    'linear-gradient(135deg,#8b7355,#d4a574)',
  ][recipe.id.charCodeAt(0) % 4];

  const missingCount = total - matched;

  return (
    <Link href={`/${lang}/recipes/${recipe.id}`}>
      <div className="rounded-2xl overflow-hidden border hover:shadow-lg transition-all duration-200 group cursor-pointer"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="relative h-40 overflow-hidden">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl"
              style={{ background: gradient }}>
              🍽️
            </div>
          )}
          <div className="absolute top-2 right-2">
            <MatchBadge matched={matched} total={total} hasFocus={hasFocus} lang={lang} />
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm mb-1 line-clamp-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            {recipe.title}
          </h3>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>{matched}/{total} {t(lang, 'recipe_ingredients').toLowerCase()}</span>
            {missingCount > 0 && (
              <span className="text-xs" style={{ color: 'var(--accent)' }}>
                {t(lang, 'identify_missing', { n: missingCount })}
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: total > 0 ? `${(matched / total) * 100}%` : '0%',
                background: matched === total ? '#10b981' : 'var(--secondary)',
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'ready' | 'almost';

export default function IdentifyPage() {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const locale = lang as Locale;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pantry, setPantry] = useState<Set<string>>(new Set());
  const [pantryLoaded, setPantryLoaded] = useState(false);

  const [inputVal, setInputVal] = useState('');
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [focus, setFocus] = useState('');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [showScan, setShowScan] = useState(false);

  const { isAdmin } = useAdmin();

  const [inspiring, setInspiring] = useState(false);
  const [inspiration, setInspiration] = useState<{ title: string; description: string; key_steps: string[] }[]>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PANTRY_KEY);
      if (raw) setPantry(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
    setPantryLoaded(true);
  }, []);

  useEffect(() => {
    if (!pantryLoaded) return;
    localStorage.setItem(PANTRY_KEY, JSON.stringify([...pantry]));
  }, [pantry, pantryLoaded]);

  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.json())
      .then(d => { setRecipes(d.recipes || []); setRecipesLoaded(true); })
      .catch(() => setRecipesLoaded(true));
  }, []);

  useEffect(() => {
    const q = inputVal.trim().toLowerCase();
    if (q.length < 2) { setAutocomplete([]); return; }
    const matches = ALL_INGREDIENTS
      .filter(i => i.includes(q) && !pantry.has(i))
      .slice(0, 8);
    setAutocomplete(matches);
  }, [inputVal, pantry]);

  const scored = recipes
    .map(r => ({ recipe: r, ...matchScore(r, pantry, focus || undefined) }))
    .filter(s => s.score > 0)
    .sort((a, b) => {
      if (a.hasFocus !== b.hasFocus) return a.hasFocus ? -1 : 1;
      return b.score - a.score;
    });

  const readyCount = scored.filter(s => s.matched === s.total && s.total > 0).length;
  const almostCount = scored.filter(s => s.score >= 0.7 && s.matched < s.total).length;

  const displayed = scored.filter(s => {
    if (filter === 'ready') return s.matched === s.total && s.total > 0;
    if (filter === 'almost') return s.score >= 0.7 && s.matched < s.total;
    return true;
  });

  const addIngredient = useCallback((item: string) => {
    const clean = item.trim().toLowerCase();
    if (!clean) return;
    setPantry(p => new Set([...p, clean]));
    setInputVal('');
    setAutocomplete([]);
  }, []);

  const removeIngredient = useCallback((item: string) => {
    setPantry(p => { const n = new Set(p); n.delete(item); return n; });
    if (focus === item) setFocus('');
  }, [focus]);

  const clearPantry = () => { setPantry(new Set()); setFocus(''); };

  function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setScanFile(f);
    setScanPreview(URL.createObjectURL(f));
    setScanError('');
  }

  async function runScan() {
    if (!scanFile) return;
    setScanning(true);
    setScanError('');
    try {
      const fd = new FormData();
      fd.append('image', scanFile);
      const res = await fetch('/api/identify', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      const identified: string[] = data.identified || [];
      identified.forEach(ing => addIngredient(ing));
      setShowScan(false);
      setScanFile(null);
      setScanPreview('');
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function inspire() {
    if (pantry.size === 0) return;
    setInspiring(true);
    setInspiration([]);
    try {
      const fd = new FormData();
      const canvas = document.createElement('canvas');
      canvas.width = 1; canvas.height = 1;
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!)));
      fd.append('image', blob, 'pantry.png');
      fd.append('pantry', JSON.stringify([...pantry]));
      fd.append('focus', focus);
      const r = await fetch('/api/identify', { method: 'POST', body: fd });
      const d = await r.json();
      setInspiration(d.suggestions || []);
    } catch { /* ignore */ } finally {
      setInspiring(false);
    }
  }

  async function saveSuggestion(s: { title: string; description: string; key_steps: string[] }, idx: number) {
    setSavingIdx(idx);
    const recipe = {
      title: s.title,
      description: s.description,
      tags: [],
      ingredients: [],
      steps: s.key_steps.map((text, i) => ({ order: i + 1, text })),
      source_type: 'chat' as const,
    };
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/${lang}/recipes/${data.recipe.id}`);
    } else {
      setSavingIdx(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--secondary)' }}>
            {t(locale, 'identify_title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {t(locale, 'identify_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* ── LEFT: Pantry Builder ── */}
          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4">

            {/* Add ingredient */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {t(locale, 'identify_your_pantry')}
                  {pantry.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'rgba(31,138,112,0.12)', color: 'var(--secondary)' }}>
                      {pantry.size}
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowScan(s => !s); setScanFile(null); setScanPreview(''); setScanError(''); }}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{ background: 'rgba(241,103,69,0.1)', color: 'var(--accent)', border: '1px solid rgba(241,103,69,0.2)' }}
                  >
                    {t(locale, 'identify_scan')}
                  </button>
                  {pantry.size > 0 && (
                    <button
                      onClick={clearPantry}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ color: 'var(--muted)' }}
                    >
                      {t(locale, 'identify_clear')}
                    </button>
                  )}
                </div>
              </div>

              {/* Photo scan panel */}
              {showScan && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleScanFile} className="hidden" />
                  {scanPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scanPreview} alt="Scan" className="w-full max-h-40 object-contain rounded-lg" />
                      <button onClick={() => { setScanFile(null); setScanPreview(''); }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full text-xs flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2"
                      style={{ borderColor: 'var(--border)' }}>
                      <span className="text-2xl">📷</span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{t(locale, 'identify_tap_photo')}</span>
                    </button>
                  )}
                  {scanFile && (
                    <button
                      onClick={runScan}
                      disabled={scanning}
                      className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}
                    >
                      {scanning ? t(locale, 'identify_scanning') : t(locale, 'identify_scan_btn')}
                    </button>
                  )}
                  {scanError && <p className="text-xs" style={{ color: '#c53030' }}>{scanError}</p>}
                </div>
              )}

              {/* Text input */}
              <div className="relative">
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && inputVal.trim()) { addIngredient(inputVal); } }}
                  placeholder={t(locale, 'identify_add_placeholder')}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
                {inputVal.trim() && (
                  <button
                    onClick={() => addIngredient(inputVal)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'var(--secondary)' }}
                  >
                    {t(locale, 'identify_add')}
                  </button>
                )}
                {autocomplete.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-20 overflow-hidden"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    {autocomplete.map(item => (
                      <button key={item} onClick={() => addIngredient(item)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pantry chips */}
              {pantry.size > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {[...pantry].map(ing => (
                    <PantryChip key={ing} label={ing} onRemove={() => removeIngredient(ing)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>
                  {t(locale, 'identify_pantry_hint')}
                </p>
              )}

              {/* Quick-add staples */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>{t(locale, 'identify_quick_staples')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_STAPLES.filter(s => !pantry.has(s)).map(s => (
                    <button key={s} onClick={() => addIngredient(s)}
                      className="px-2.5 py-1 rounded-full text-xs transition-colors hover:opacity-70"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category browser */}
            <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t(locale, 'identify_categories')}</h2>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(INGREDIENT_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={activeCategory === cat
                      ? { background: 'var(--secondary)', color: 'white' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {activeCategory && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {INGREDIENT_CATEGORIES[activeCategory].filter(i => !pantry.has(i)).map(i => (
                    <button key={i} onClick={() => addIngredient(i)}
                      className="px-2.5 py-1 rounded-full text-xs transition-opacity hover:opacity-70"
                      style={{ background: 'rgba(31,138,112,0.08)', color: 'var(--secondary)', border: '1px solid rgba(31,138,112,0.2)' }}>
                      + {i}
                    </button>
                  ))}
                  {INGREDIENT_CATEGORIES[activeCategory].filter(i => !pantry.has(i)).length === 0 && (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{t(locale, 'identify_all_added')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Focus ingredient */}
            {pantry.size > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>
                  {t(locale, 'identify_focus_label')}
                </h2>
                <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                  {t(locale, 'identify_focus_hint')}
                </p>
                <select
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t(locale, 'identify_focus_any')}</option>
                  {[...pantry].map(ing => (
                    <option key={ing} value={ing}>{ing}</option>
                  ))}
                </select>
                {focus && (
                  <p className="text-xs mt-2" style={{ color: 'var(--secondary)' }}>
                    {t(locale, 'identify_focus_active')} <strong>{focus}</strong>
                  </p>
                )}
              </div>
            )}

          </div>

          {/* ── RIGHT: Results ── */}
          <div className="lg:col-span-3">

            {/* Empty pantry state */}
            {pantry.size === 0 && (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-6xl mb-4">🧺</div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                  {t(locale, 'identify_pantry_empty')}
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                  {t(locale, 'identify_pantry_hint')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_STAPLES.slice(0, 6).map(s => (
                    <button key={s} onClick={() => addIngredient(s)}
                      className="px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-70"
                      style={{ background: 'rgba(31,138,112,0.1)', color: 'var(--secondary)', border: '1px solid rgba(31,138,112,0.2)' }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {pantry.size > 0 && (
              <>
                {/* Filter tabs */}
                <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  {([
                    { id: 'all', label: `${t(locale, 'identify_filter_all')} (${scored.length})` },
                    { id: 'ready', label: `✓ ${t(locale, 'identify_filter_make_now')} (${readyCount})` },
                    { id: 'almost', label: `${t(locale, 'identify_filter_almost')} (${almostCount})` },
                  ] as { id: FilterTab; label: string }[]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={filter === tab.id
                        ? { background: 'var(--secondary)', color: 'white' }
                        : { color: 'var(--muted)' }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Loading state */}
                {!recipesLoaded && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <div className="h-40 animate-pulse" style={{ background: 'var(--border)' }} />
                        <div className="p-3 space-y-2">
                          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--border)', width: '80%' }} />
                          <div className="h-2 rounded animate-pulse" style={{ background: 'var(--border)', width: '50%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No matches */}
                {recipesLoaded && displayed.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>
                      {filter !== 'all' ? t(locale, 'identify_no_filter_matches') : t(locale, 'identify_no_matches')}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {filter !== 'all'
                        ? t(locale, 'identify_try_all_filter')
                        : t(locale, 'identify_no_matches_hint')}
                    </p>
                  </div>
                )}

                {/* Recipe grid — YOUR collection */}
                {recipesLoaded && displayed.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {t(locale, 'identify_from_collection')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'rgba(31,138,112,0.1)', color: 'var(--secondary)' }}>
                        {displayed.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {displayed.map(({ recipe, matched, total, hasFocus }) => (
                        <RecipeMatchCard
                          key={recipe.id}
                          recipe={recipe}
                          matched={matched}
                          total={total}
                          hasFocus={hasFocus}
                          lang={locale}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* AI Inspiration results — below collection */}
                {inspiration.length > 0 && (
                  <div className="mt-8 rounded-2xl p-5 space-y-4"
                    style={{ background: 'var(--card)', border: '1px solid rgba(241,103,69,0.2)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {t(locale, 'identify_ai_ideas')}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(241,103,69,0.1)', color: 'var(--accent)' }}>
                        {t(locale, 'identify_not_in_collection')}
                      </span>
                      <button onClick={() => setInspiration([])} className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>{t(locale, 'identify_dismiss')}</button>
                    </div>
                    {inspiration.map((s, i) => (
                      <div key={i} className="rounded-xl p-4 flex items-start gap-4"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{s.title}</h3>
                          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{s.description}</p>
                          {s.key_steps?.slice(0, 3).map((step, j) => (
                            <p key={j} className="text-xs" style={{ color: 'var(--muted)' }}>
                              <span style={{ color: 'var(--accent)' }}>{j + 1}. </span>{step}
                            </p>
                          ))}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => saveSuggestion(s, i)}
                            disabled={savingIdx === i}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                            style={{ background: 'var(--secondary)' }}
                          >
                            {savingIdx === i ? t(locale, 'identify_saving') : t(locale, 'identify_save_recipe')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Prompt to generate AI ideas if no inspiration yet */}
                {inspiration.length === 0 && pantry.size >= 3 && recipesLoaded && (
                  <div className="mt-8 rounded-2xl p-5 flex items-center justify-between gap-4"
                    style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                        {t(locale, 'identify_want_more')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {t(locale, 'identify_want_more_hint')}
                      </p>
                    </div>
                    <button
                      onClick={inspire}
                      disabled={inspiring}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, var(--secondary), var(--accent))' }}
                    >
                      {inspiring ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          {t(locale, 'identify_thinking')}
                        </span>
                      ) : t(locale, 'identify_generate')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
