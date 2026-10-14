import { describe, it, expect } from 'vitest';
import { buildShoppingList, parseAmount, formatAmount, aisleKeyFor } from '@/lib/shoppingList';

describe('parseAmount', () => {
  it('reads whole numbers, decimals, fractions and mixed numbers', () => {
    expect(parseAmount('2')).toBe(2);
    expect(parseAmount('1.5')).toBe(1.5);
    expect(parseAmount('1,5')).toBe(1.5);
    expect(parseAmount('1/2')).toBe(0.5);
    expect(parseAmount('1 1/2')).toBe(1.5);
    expect(parseAmount('½')).toBe(0.5);
    expect(parseAmount('1½')).toBe(1.5);
  });
  it('takes the upper bound of a range so nothing is under-bought', () => {
    expect(parseAmount('2-3')).toBe(3);
  });
  it('returns null for anything that is not a plain amount', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount('to taste')).toBeNull();
    expect(parseAmount('a pinch')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('1/0')).toBeNull();
  });
});

describe('formatAmount', () => {
  it('prints tidy numbers', () => {
    expect(formatAmount(2)).toBe('2');
    expect(formatAmount(1.5)).toBe('1½');
    expect(formatAmount(0.25)).toBe('¼');
    expect(formatAmount(2.75)).toBe('2¾');
    expect(formatAmount(1.2)).toBe('1.2');
    expect(formatAmount(1.9999)).toBe('2');
  });
});

describe('aisleKeyFor', () => {
  it('puts common items in the right aisle (English and Spanish)', () => {
    expect(aisleKeyFor('tomatoes')).toBe('produce');
    expect(aisleKeyFor('cebolla')).toBe('produce');
    expect(aisleKeyFor('chicken thighs')).toBe('meat');
    expect(aisleKeyFor('queso fresco')).toBe('dairy');
    expect(aisleKeyFor('white rice')).toBe('pantry');
    expect(aisleKeyFor('salt')).toBe('spices');
    expect(aisleKeyFor('soy sauce')).toBe('sauces');
    expect(aisleKeyFor('tortillas')).toBe('bakery');
  });
  it('lets the specific rule beat the general one', () => {
    expect(aisleKeyFor('coconut milk')).toBe('pantry'); // not dairy
    expect(aisleKeyFor('garlic powder')).toBe('spices'); // not produce
    expect(aisleKeyFor('chicken broth')).toBe('pantry'); // not meat
  });
  it('falls back to other', () => {
    expect(aisleKeyFor('xyzzy')).toBe('other');
    expect(aisleKeyFor('')).toBe('other');
  });
});

describe('buildShoppingList', () => {
  it('returns [] for no recipes or no ingredients', () => {
    expect(buildShoppingList([])).toEqual([]);
    expect(buildShoppingList([{ ingredients: [] }, { ingredients: null }])).toEqual([]);
  });

  it('keeps the shape the meal page renders: aisle, aisle_es and items with name/name_es/qty/qty_es', () => {
    const out = buildShoppingList([
      { ingredients: [{ item: 'Tomatoes', amount: '2', unit: 'cups' }], ingredients_es: [{ item: 'Tomates' }] },
    ]);
    expect(out).toEqual([
      {
        aisle: 'Produce',
        aisle_es: 'Frutas y verduras',
        items: [{ name: 'Tomatoes', name_es: 'Tomates', qty: '2 cups', qty_es: '2 tazas' }],
      },
    ]);
  });

  it('adds quantities of the same ingredient and unit across recipes (case/accent-insensitive)', () => {
    const out = buildShoppingList([
      { ingredients: [{ item: 'Onion', amount: '1', unit: '' }] },
      { ingredients: [{ item: 'onion', amount: '2', unit: '' }, { item: 'Rice', amount: '1', unit: 'cup' }] },
      { ingredients: [{ item: 'rice', amount: '1/2', unit: 'cup' }] },
    ]);
    const all = out.flatMap(a => a.items);
    expect(all.find(i => i.name === 'Onion')?.qty).toBe('3');
    expect(all.find(i => i.name === 'Rice')?.qty).toBe('1½ cup');
  });

  it('does not add different units together; it lists both', () => {
    const out = buildShoppingList([
      { ingredients: [{ item: 'Flour', amount: '2', unit: 'cups' }] },
      { ingredients: [{ item: 'flour', amount: '100', unit: 'g' }] },
    ]);
    expect(out[0].items).toHaveLength(1);
    expect(out[0].items[0].qty).toBe('2 cups + 100 g');
  });

  it('keeps amounts it cannot parse as text and never drops the ingredient', () => {
    const out = buildShoppingList([
      { ingredients: [{ item: 'Salt', amount: 'to taste', unit: '' }, { item: 'Salt', amount: '1', unit: 'tsp' }] },
      { ingredients: [{ item: 'Cilantro', amount: '', unit: '' }] },
    ]);
    const all = out.flatMap(a => a.items);
    expect(all.find(i => i.name === 'Salt')?.qty).toBe('1 tsp + to taste');
    const cilantro = all.find(i => i.name === 'Cilantro');
    expect(cilantro).toBeTruthy();
    expect(cilantro?.qty).toBeNull();
  });

  it('puts unknown ingredients in "Other", last, and orders the known aisles', () => {
    const out = buildShoppingList([
      { ingredients: [{ item: 'Mystery thing', amount: '1', unit: '' }, { item: 'Chicken', amount: '1', unit: 'kg' }, { item: 'Tomato', amount: '3', unit: '' }] },
    ]);
    expect(out.map(a => a.aisle)).toEqual(['Produce', 'Meat & seafood', 'Other']);
    expect(out[2].aisle_es).toBe('Otros');
  });

  it('skips blank names and tolerates null entries', () => {
    const out = buildShoppingList([{ ingredients: [null, { item: '  ', amount: '1', unit: '' }, { item: 'Milk', amount: '1', unit: 'l' }] }]);
    expect(out.flatMap(a => a.items).map(i => i.name)).toEqual(['Milk']);
  });

  it('is aligned by index with ingredients_es and tolerates a shorter/missing Spanish list', () => {
    const out = buildShoppingList([
      { ingredients: [{ item: 'Beans', amount: '1', unit: 'cup' }, { item: 'Rice', amount: '1', unit: 'cup' }], ingredients_es: [{ item: 'Frijoles' }] },
    ]);
    const all = out.flatMap(a => a.items);
    expect(all.find(i => i.name === 'Beans')?.name_es).toBe('Frijoles');
    expect(all.find(i => i.name === 'Rice')?.name_es).toBeNull();
  });
});
