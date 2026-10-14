import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// The components only touch the router and `fetch` after a user action or an
// effect; a static server render does neither, so nothing here can reach the network.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} }),
}));

import MealDeleteDialog from '@/components/MealDeleteDialog';
import MealForm from '@/components/MealForm';

const noop = () => {};

describe('MealDeleteDialog', () => {
  const render = (lang: string) =>
    renderToStaticMarkup(createElement(MealDeleteDialog, { mealId: 'm1', title: 'Gallo & café', lang, onClose: noop, onDeleted: noop }));

  it('is an accessible modal that names the meal being deleted (Spanish)', () => {
    const html = render('es');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="meal-delete-title"');
    expect(html).toContain('Eliminar');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Gallo &amp; café');
    expect(html).not.toContain('role="alert"');
  });

  it('renders in English too', () => {
    const html = render('en');
    expect(html).toContain('Cancel');
    expect(html).toContain('Delete');
  });
});

describe('MealForm', () => {
  const initial = {
    id: 'm1', slug: 'almuerzo', title: 'Lunch', title_es: 'Almuerzo', note: null, note_es: null, recipeIds: ['r1', 'r2'],
  };

  it('a new meal starts empty, with the picker loading and the create title', () => {
    const html = renderToStaticMarkup(createElement(MealForm, { lang: 'en', onClose: noop }));
    expect(html).toContain('New meal');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Loading recipes');
    expect(html).not.toContain('value="almuerzo"');
  });

  it('editing pre-fills the fields and shows the recipe count, in Spanish', () => {
    const html = renderToStaticMarkup(createElement(MealForm, { lang: 'es', initial, onClose: noop }));
    expect(html).toContain('Editar comida');
    expect(html).toContain('value="Lunch"');
    expect(html).toContain('value="Almuerzo"');
    expect(html).toContain('value="almuerzo"');
    expect(html).toContain('(2)');
  });

  it('every input has a label', () => {
    const html = renderToStaticMarkup(createElement(MealForm, { lang: 'en', initial, onClose: noop }));
    for (const id of ['meal-title', 'meal-title-es', 'meal-note', 'meal-note-es', 'meal-slug']) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
  });
});
