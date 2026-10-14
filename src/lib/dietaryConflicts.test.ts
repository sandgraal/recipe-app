import { describe, it, expect } from 'vitest';
import { dietaryConflicts, fold } from '@/lib/dietaryConflicts';

const ing = (item: string, notes?: string) => ({ amount: '1', unit: 'cup', item, notes });
const conflicts = (dietary: string[], ...items: string[]) => dietaryConflicts(dietary, items.map(i => ing(i)));
const labels = (dietary: string[], ...items: string[]) => conflicts(dietary, ...items).map(c => c.label);

describe('fold', () => {
  it('drops accents and case', () => {
    expect(fold('  Camarón   Jamón ')).toBe('camaron jamon');
  });
});

describe('no flags, no conflicts', () => {
  it('ignores recipes without a relevant dietary label', () => {
    expect(conflicts([], 'chicken', 'butter')).toEqual([]);
    expect(dietaryConflicts(null, [ing('beef')])).toEqual([]);
    expect(conflicts(['gluten-free', 'keto', 'pescatarian'], 'beef', 'milk')).toEqual([]);
  });
});

describe('vegetarian / vegan with meat, fish or animal fat', () => {
  it.each([
    'beef', 'ground pork', 'chicken breast', 'bacon', 'ham', 'sausage', 'chorizo', 'fish fillet', 'anchovies', 'anchovy paste',
    'Worcestershire sauce', 'fish sauce', 'shrimp', 'tuna', 'salmon', 'gelatin', 'lard',
    'res molida', 'cerdo', 'pollo', 'pescado', 'camarón', 'camarones', 'manteca de cerdo', 'Jamón', 'atún', 'caldo de pollo',
  ])('flags %s for a vegetarian recipe', item => {
    expect(labels(['vegetarian'], item)).toEqual(['vegetarian']);
  });

  it('reports vegan when both labels are set', () => {
    expect(labels(['vegetarian', 'vegan'], 'chicken stock')).toEqual(['vegan']);
  });

  it('matches plurals, notes and mixed case', () => {
    expect(labels(['vegetarian'], 'Sausages')).toEqual(['vegetarian']);
    expect(dietaryConflicts(['vegetarian'], [ing('stock', 'preferably chicken')])).toHaveLength(1);
  });

  it('does not flag a line that offers a vegetarian alternative with "or"', () => {
    expect(labels(['vegetarian'], 'vegetable or chicken broth')).toEqual([]);
    expect(labels(['vegetarian'], 'chicken or vegetable broth')).toEqual([]);
    expect(labels(['vegetarian'], 'caldo de pollo o de verduras')).toEqual([]);
    expect(labels(['vegetarian'], 'tofu or chicken')).toEqual([]);
  });

  it('still flags "or" lines with no vegetarian option', () => {
    expect(labels(['vegetarian'], 'chicken or beef broth')).toEqual(['vegetarian']);
  });

  it('whole words only', () => {
    expect(labels(['vegetarian'], 'hamburger bun')).toEqual([]);
    expect(labels(['vegetarian'], 'shamrock')).toEqual([]);
    expect(labels(['vegetarian'], 'resistant starch')).toEqual([]);
    expect(labels(['vegetarian'], 'codex')).toEqual([]);
  });

  it('vegetarian allows dairy and eggs', () => {
    expect(labels(['vegetarian'], 'butter', '2 eggs', 'cheese', 'honey')).toEqual([]);
  });
});

describe('vegan with dairy, eggs or honey', () => {
  it.each([
    'egg', 'eggs', 'milk', 'butter', 'cheese', 'heavy cream', 'yogurt', 'honey', 'ghee', 'natilla', 'buttermilk', 'sour cream',
    'huevos', 'leche', 'mantequilla', 'queso', 'crema', 'miel', 'yogur', 'Natilla',
  ])('flags %s', item => {
    expect(labels(['vegan'], item)).toEqual(['vegan']);
  });

  it.each([
    'coconut milk', 'coconut cream', 'peanut butter', 'cream of tartar', 'almond milk', 'oat milk', 'cocoa butter',
    'cream of coconut', 'leche de coco', 'crema de coco', 'mantequilla de maní', 'crema de tártaro', 'miel de maple',
    'egg-free mayo', 'sin huevo',
  ])('does not flag %s', item => {
    expect(labels(['vegan'], item)).toEqual([]);
  });

  it('eggplant is not egg and butternut is not butter', () => {
    expect(labels(['vegan'], 'eggplant', 'butternut squash', 'berenjena')).toEqual([]);
  });
});

describe('dairy-free', () => {
  it.each(['milk', 'butter', 'cheese', 'cream', 'yogurt', 'ghee', 'natilla', 'parmesan', 'mozzarella', 'leche', 'queso', 'mantequilla'])(
    'flags %s', item => {
      expect(labels(['dairy-free'], item)).toEqual(['dairy-free']);
    },
  );

  it('keeps the same exceptions and ignores eggs, honey and meat', () => {
    expect(labels(['dairy-free'], 'coconut milk', 'peanut butter', 'cream of tartar', 'eggplant', 'butternut')).toEqual([]);
    expect(labels(['dairy-free'], 'eggs', 'honey', 'chicken')).toEqual([]);
  });
});

describe('result shape', () => {
  it('returns the ingredient as written, once per label and line', () => {
    const r = dietaryConflicts(['vegan'], [ing('Butter'), ing('Butter'), ing('olive oil')]);
    expect(r).toEqual([{ label: 'vegan', ingredient: 'Butter' }]);
  });

  it('reads Spanish entries too and tolerates junk rows', () => {
    expect(dietaryConflicts(['vegan'], [null, 5, 'queso fresco', { notes: 'miel' }, {}])).toHaveLength(2);
  });

  it('a recipe can break several labels', () => {
    expect(labels(['vegan', 'dairy-free'], 'butter')).toEqual(['vegan', 'dairy-free']);
  });
});
