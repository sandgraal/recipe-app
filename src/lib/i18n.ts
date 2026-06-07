import type { Recipe } from './types';

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

// ── UI string dictionary ─────────────────────────────────────────────────────

const translations = {
  en: {
    // Nav
    nav_browse: 'Browse',
    nav_import: 'Import',
    nav_pantry: 'What Can I Cook?',
    // Homepage
    home_title: 'My Cookbook',
    home_recently_added: 'Recently Added',
    home_under_30: '⚡ Under 30 Minutes',
    home_what_can_cook: '🧺 What can I cook?',
    home_import_chip: '🔗 Import recipe',
    home_under_30_chip: '⚡ Under 30 min',
    home_all_recipes: '📚 All {n} recipes',
    home_see_all: 'See all',
    home_all_n: 'All {n}',
    home_results_one: '{n} result',
    home_results_many: '{n} results',
    home_all_count: 'All {n} recipes',
    home_grow_hint: 'Your collection is growing. Keep importing to unlock more collections.',
    home_import_another: '🔗 Import another recipe',
    home_empty_title: 'Your recipe collection awaits',
    home_empty_hint: 'Import from a URL, snap a photo, paste text, or start from scratch.',
    home_import_url: '🔗 Import from URL',
    home_scan: '📸 Scan ingredients',
    home_add_manual: '✏️ Add manually',
    home_add_recipe: 'Add Recipe',
    home_search: 'Search',
    home_back: '← Back',
    // Greetings
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_dinner: "What's for dinner?",
    greeting_night: 'Late night eats',
    greeting_hint_morning: 'Breakfast & brunch recipes',
    greeting_hint_afternoon: 'Light lunches & snacks',
    greeting_hint_dinner: "Tonight's favorites",
    greeting_hint_night: 'Quick & easy snacks',
    // Search overlay
    search_placeholder: 'Search recipes, cuisines, ingredients…',
    search_all_cuisines: 'All cuisines',
    search_clear: 'Clear',
    search_found_one: '{n} recipe found',
    search_found_many: '{n} recipes found',
    search_matching: 'matching',
    // Recipe detail
    recipe_back: '← Back',
    recipe_cook_mode: '👨‍🍳 Cook Mode',
    recipe_edit: 'Edit',
    recipe_delete: 'Delete',
    recipe_ingredients: 'Ingredients',
    recipe_instructions: 'Instructions',
    recipe_notes: 'Notes',
    recipe_servings: '{n} servings',
    recipe_original: '↗ Original recipe',
    recipe_no_ingredients: 'No ingredients listed.',
    recipe_no_steps: 'No steps listed.',
    recipe_delete_title: 'Delete Recipe?',
    recipe_delete_body: '"{title}" will be permanently deleted.',
    recipe_delete_cancel: 'Cancel',
    recipe_deleting: 'Deleting…',
    recipe_not_found: 'Recipe not found',
    recipe_step_of: 'Step {i} of {n}',
    recipe_clear_checked: 'Clear {n} checked',
    recipe_exit_cook: 'Exit Cook Mode ✕',
    recipe_done: '🎉 Done!',
    recipe_prev: '← Prev',
    recipe_next: 'Next →',
    recipe_swipe: 'swipe or tap',
    recipe_srv: 'srv',
    // Translation banner
    translate_banner: 'This recipe is not yet available in Spanish.',
    translate_btn: '🌐 Translate now',
    translate_loading: 'Translating…',
    translate_done: '✓ Translation saved',
    translate_error: 'Translation failed. Try again.',
    // AI Chat
    chat_title: 'Ask about this recipe',
    chat_subtitle: 'substitutions · tips · scaling',
    chat_placeholder: 'Ask anything about this recipe…',
    chat_ask: 'Ask',
    chat_thinking: 'thinking…',
    chat_error: "Sorry, couldn't reach the AI right now.",
    chat_suggestion_1: 'Can I substitute anything?',
    chat_suggestion_2: 'How do I not overcook this?',
    chat_suggestion_3: 'Make it spicier',
    // Import page
    import_title: 'Import Recipe',
    import_tab_url: 'From URL',
    import_tab_text: 'Paste Text',
    import_tab_photo: 'Photo',
    import_tab_manual: 'Manual',
    import_save: 'Save to My Recipes',
    import_saving: 'Saving...',
    import_url_label: 'Recipe URL',
    import_url_placeholder: 'https://example.com/recipe',
    import_url_btn: 'Import',
    import_url_importing: 'Importing…',
    import_text_label: 'Paste recipe text',
    import_text_placeholder: 'Paste a recipe here…',
    import_text_btn: 'Parse Recipe',
    import_text_parsing: 'Parsing…',
    import_photo_label: 'Upload a photo of a recipe',
    import_photo_btn: 'Analyze Photo',
    import_photo_analyzing: 'Analyzing…',
    // Identify / pantry
    identify_title: 'What Can I Cook?',
    identify_subtitle: "Tell me what's in your kitchen",
    identify_add_placeholder: 'Add ingredient…',
    identify_add: 'Add',
    identify_scan: '📸 Scan fridge',
    identify_inspire: '✨ Inspire Me',
    identify_clear: 'Clear all',
    identify_your_pantry: 'Your Pantry',
    identify_pantry_empty: 'Your pantry is empty',
    identify_pantry_hint: 'Add ingredients above to find matching recipes',
    identify_filter_all: 'All',
    identify_filter_make_now: 'Make now',
    identify_filter_almost: 'Almost (70%+)',
    identify_no_matches: 'No matches yet',
    identify_no_matches_hint: 'Try adding more ingredients',
    identify_match_badge_full: '✓ Make now',
    identify_results_title: 'Matching Recipes',
    identify_inspire_title: 'AI Suggestions',
    identify_save_recipe: '+ Save',
    identify_saving: 'Saving…',
    identify_focus_label: 'Focus on ingredient',
    identify_focus_any: 'Any',
    identify_quick_staples: 'Quick staples',
    identify_categories: 'Browse by category',
    identify_from_collection: 'From your collection',
    identify_ai_ideas: 'AI recipe ideas',
    identify_not_in_collection: 'not in your collection',
    identify_dismiss: 'Dismiss',
    identify_want_more: '✨ Want more ideas?',
    identify_want_more_hint: 'Generate AI recipe suggestions using your pantry ingredients.',
    identify_generate: 'Generate ideas',
    identify_thinking: 'Thinking…',
    identify_tap_photo: 'Tap to take / upload photo',
    identify_scanning: 'Scanning…',
    identify_scan_btn: 'Identify ingredients',
    identify_focus_hint: 'Prioritize recipes that feature one ingredient.',
    identify_focus_active: '★ Showing recipes featuring',
    identify_all_added: 'All added ✓',
    identify_missing: '{n} missing',
    identify_ingredients_count: '{matched}/{total} ingredients',
    identify_no_filter_matches: 'No recipes match this filter',
    identify_try_all_filter: 'Try "All" to see partial matches',
    // Footer
    footer_store: 'Visit our store →',
  },
  es: {
    // Nav
    nav_browse: 'Explorar',
    nav_import: 'Importar',
    nav_pantry: '¿Qué puedo cocinar?',
    // Homepage
    home_title: 'Mi Recetario',
    home_recently_added: 'Añadidas Recientemente',
    home_under_30: '⚡ En Menos de 30 Minutos',
    home_what_can_cook: '🧺 ¿Qué puedo cocinar?',
    home_import_chip: '🔗 Importar receta',
    home_under_30_chip: '⚡ Menos de 30 min',
    home_all_recipes: '📚 Todas las {n} recetas',
    home_see_all: 'Ver todas',
    home_all_n: 'Todas ({n})',
    home_results_one: '{n} resultado',
    home_results_many: '{n} resultados',
    home_all_count: 'Todas las {n} recetas',
    home_grow_hint: 'Tu colección crece. Importa más para descubrir nuevas secciones.',
    home_import_another: '🔗 Importar otra receta',
    home_empty_title: 'Tu colección de recetas te espera',
    home_empty_hint: 'Importa desde una URL, saca una foto, pega texto o empieza desde cero.',
    home_import_url: '🔗 Importar desde URL',
    home_scan: '📸 Escanear ingredientes',
    home_add_manual: '✏️ Agregar manualmente',
    home_add_recipe: 'Agregar Receta',
    home_search: 'Buscar',
    home_back: '← Volver',
    // Greetings
    greeting_morning: 'Buenos días',
    greeting_afternoon: 'Buenas tardes',
    greeting_dinner: '¿Qué hay para cenar?',
    greeting_night: 'Snacks nocturnos',
    greeting_hint_morning: 'Recetas de desayuno',
    greeting_hint_afternoon: 'Almuerzos y snacks',
    greeting_hint_dinner: 'Favoritas de esta noche',
    greeting_hint_night: 'Recetas rápidas y fáciles',
    // Search overlay
    search_placeholder: 'Buscar recetas, cocinas, ingredientes…',
    search_all_cuisines: 'Todas las cocinas',
    search_clear: 'Limpiar',
    search_found_one: '{n} receta encontrada',
    search_found_many: '{n} recetas encontradas',
    search_matching: 'con',
    // Recipe detail
    recipe_back: '← Volver',
    recipe_cook_mode: '👨‍🍳 Modo Cocina',
    recipe_edit: 'Editar',
    recipe_delete: 'Eliminar',
    recipe_ingredients: 'Ingredientes',
    recipe_instructions: 'Instrucciones',
    recipe_notes: 'Notas',
    recipe_servings: '{n} porciones',
    recipe_original: '↗ Receta original',
    recipe_no_ingredients: 'Sin ingredientes.',
    recipe_no_steps: 'Sin instrucciones.',
    recipe_delete_title: '¿Eliminar receta?',
    recipe_delete_body: '"{title}" se eliminará permanentemente.',
    recipe_delete_cancel: 'Cancelar',
    recipe_deleting: 'Eliminando…',
    recipe_not_found: 'Receta no encontrada',
    recipe_step_of: 'Paso {i} de {n}',
    recipe_clear_checked: 'Desmarcar {n}',
    recipe_exit_cook: 'Salir del Modo Cocina ✕',
    recipe_done: '🎉 ¡Listo!',
    recipe_prev: '← Anterior',
    recipe_next: 'Siguiente →',
    recipe_swipe: 'desliza o toca',
    recipe_srv: 'porc.',
    // Translation banner
    translate_banner: 'Esta receta aún no está disponible en español.',
    translate_btn: '🌐 Traducir ahora',
    translate_loading: 'Traduciendo…',
    translate_done: '✓ Traducción guardada',
    translate_error: 'Error al traducir. Intenta de nuevo.',
    // AI Chat
    chat_title: 'Pregunta sobre esta receta',
    chat_subtitle: 'sustituciones · consejos · porciones',
    chat_placeholder: 'Pregunta lo que quieras…',
    chat_ask: 'Enviar',
    chat_thinking: 'pensando…',
    chat_error: 'Lo siento, el asistente no está disponible.',
    chat_suggestion_1: '¿Puedo sustituir algo?',
    chat_suggestion_2: '¿Cómo evito que se pase?',
    chat_suggestion_3: 'Hazlo más picante',
    // Import page
    import_title: 'Importar Receta',
    import_tab_url: 'Desde URL',
    import_tab_text: 'Pegar Texto',
    import_tab_photo: 'Foto',
    import_tab_manual: 'Manual',
    import_save: 'Guardar en Mis Recetas',
    import_saving: 'Guardando...',
    import_url_label: 'URL de la receta',
    import_url_placeholder: 'https://ejemplo.com/receta',
    import_url_btn: 'Importar',
    import_url_importing: 'Importando…',
    import_text_label: 'Pega el texto de la receta',
    import_text_placeholder: 'Pega una receta aquí…',
    import_text_btn: 'Analizar Receta',
    import_text_parsing: 'Analizando…',
    import_photo_label: 'Sube una foto de la receta',
    import_photo_btn: 'Analizar Foto',
    import_photo_analyzing: 'Analizando…',
    // Identify / pantry
    identify_title: '¿Qué puedo cocinar?',
    identify_subtitle: 'Cuéntame qué hay en tu cocina',
    identify_add_placeholder: 'Agregar ingrediente…',
    identify_add: 'Agregar',
    identify_scan: '📸 Escanear nevera',
    identify_inspire: '✨ Inspírame',
    identify_clear: 'Borrar todo',
    identify_your_pantry: 'Tu Despensa',
    identify_pantry_empty: 'Tu despensa está vacía',
    identify_pantry_hint: 'Agrega ingredientes para encontrar recetas',
    identify_filter_all: 'Todas',
    identify_filter_make_now: 'Cocinar ya',
    identify_filter_almost: 'Casi (70%+)',
    identify_no_matches: 'Sin coincidencias',
    identify_no_matches_hint: 'Agrega más ingredientes',
    identify_match_badge_full: '✓ Cocinar ya',
    identify_results_title: 'Recetas Compatibles',
    identify_inspire_title: 'Sugerencias de IA',
    identify_save_recipe: '+ Guardar',
    identify_saving: 'Guardando…',
    identify_focus_label: 'Enfocar en ingrediente',
    identify_focus_any: 'Cualquiera',
    identify_quick_staples: 'Básicos rápidos',
    identify_categories: 'Explorar por categoría',
    identify_from_collection: 'De tu colección',
    identify_ai_ideas: 'Ideas de recetas con IA',
    identify_not_in_collection: 'no están en tu colección',
    identify_dismiss: 'Cerrar',
    identify_want_more: '✨ ¿Quieres más ideas?',
    identify_want_more_hint: 'Genera sugerencias de recetas con IA usando tu despensa.',
    identify_generate: 'Generar ideas',
    identify_thinking: 'Pensando…',
    identify_tap_photo: 'Toca para tomar / subir foto',
    identify_scanning: 'Escaneando…',
    identify_scan_btn: 'Identificar ingredientes',
    identify_focus_hint: 'Priorizar recetas que incluyan un ingrediente.',
    identify_focus_active: '★ Mostrando recetas con',
    identify_all_added: 'Todos agregados ✓',
    identify_missing: '{n} faltantes',
    identify_ingredients_count: '{matched}/{total} ingredientes',
    identify_no_filter_matches: 'Ninguna receta coincide con este filtro',
    identify_try_all_filter: 'Prueba "Todas" para ver coincidencias parciales',
    // Footer
    footer_store: 'Visita nuestra tienda →',
  },
} as const;

type Translations = typeof translations.en;
export type TranslationKey = keyof Translations;

// ── Translation helper ────────────────────────────────────────────────────────

export function t(
  lang: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const dict = translations[lang] as Record<string, string>;
  const fallback = translations.en as Record<string, string>;
  let str = dict[key] ?? fallback[key] ?? key;
  if (vars) {
    str = Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      str
    );
  }
  return str;
}

// ── Recipe field helpers (falls back to English if no translation) ────────────

export function recipeTitle(recipe: Recipe, lang: Locale): string {
  return (lang === 'es' && recipe.title_es) ? recipe.title_es : recipe.title;
}

export function recipeDescription(recipe: Recipe, lang: Locale): string | null | undefined {
  return (lang === 'es' && recipe.description_es) ? recipe.description_es : recipe.description;
}

export function recipeNotes(recipe: Recipe, lang: Locale): string | null | undefined {
  return (lang === 'es' && recipe.notes_es) ? recipe.notes_es : recipe.notes;
}

export function recipeSteps(recipe: Recipe, lang: Locale) {
  if (lang === 'es' && recipe.steps_es && recipe.steps_es.length > 0) {
    return recipe.steps_es;
  }
  return recipe.steps || [];
}

export function recipeIngredientItem(
  recipe: Recipe,
  index: number,
  lang: Locale
): { item: string; notes?: string } {
  if (lang === 'es' && recipe.ingredients_es && recipe.ingredients_es[index]) {
    return recipe.ingredients_es[index];
  }
  const ing = recipe.ingredients[index];
  return { item: ing.item, notes: ing.notes };
}

export function recipeTags(recipe: Recipe, lang: Locale): string[] {
  return (lang === 'es' && recipe.tags_es && recipe.tags_es.length > 0)
    ? recipe.tags_es
    : (recipe.tags || []);
}

export function hasSpanishTranslation(recipe: Recipe): boolean {
  return !!(recipe.title_es && recipe.steps_es && recipe.steps_es.length > 0);
}

// ── Time string localisation ──────────────────────────────────────────────────
// total_time is stored as English strings (e.g. "30 min", "1 hour 30 minutes").
// This function translates common time words to Spanish when needed.

const TIME_ES: [RegExp, string][] = [
  [/\bhours?\b/gi, 'h'],
  [/\bhr?s?\b/gi, 'h'],
  [/\bminutes?\b/gi, 'min'],
  [/\bmins?\b/gi, 'min'],
  [/\bseconds?\b/gi, 'seg'],
  [/\bdays?\b/gi, 'día(s)'],
  [/\bweeks?\b/gi, 'semana(s)'],
];

export function formatTime(time: string | null | undefined, lang: Locale): string {
  if (!time) return '';
  if (lang !== 'es') return time;
  let out = time;
  for (const [pat, rep] of TIME_ES) out = out.replace(pat, rep);
  return out;
}

// ── Measurement unit localisation ─────────────────────────────────────────────
// Ingredient `unit` is stored in English (e.g. "cup", "tbsp", "cloves"). The
// Spanish view keeps the numeric amount but shows local unit words. Volumetric
// units (taza, cucharada) are the everyday standard in Costa Rican home recipes;
// metric units (g, kg, ml, l) are already universal and pass through unchanged.

const UNIT_ES: Record<string, string> = {
  cup: 'taza', cups: 'tazas',
  tablespoon: 'cda', tablespoons: 'cda', tbsp: 'cda', tbs: 'cda',
  teaspoon: 'cdta', teaspoons: 'cdta', tsp: 'cdta',
  clove: 'diente', cloves: 'dientes',
  pinch: 'pizca', pinches: 'pizcas',
  dash: 'chorrito', dashes: 'chorritos',
  can: 'lata', cans: 'latas',
  jar: 'frasco', jars: 'frascos',
  bunch: 'manojo', bunches: 'manojos',
  handful: 'puñado', handfuls: 'puñados',
  slice: 'rebanada', slices: 'rebanadas',
  piece: 'trozo', pieces: 'trozos',
  stick: 'barra', sticks: 'barras',
  package: 'paquete', packages: 'paquete', pkg: 'paquete',
  ounce: 'onza', ounces: 'onzas', oz: 'onza',
  pound: 'libra', pounds: 'libras', lb: 'libra', lbs: 'libras',
  quart: 'cuarto', quarts: 'cuartos',
  gallon: 'galón', gallons: 'galones',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l',
};

export function localizeUnit(unit: string | null | undefined, lang: Locale): string {
  if (!unit) return '';
  if (lang !== 'es') return unit;
  const key = unit.trim().toLowerCase().replace(/\.$/, '');
  return UNIT_ES[key] ?? unit;
}

// ── Greeting helper ───────────────────────────────────────────────────────────

export function getGreeting(lang: Locale) {
  const h = new Date().getHours();
  if (h < 12) return { text: t(lang, 'greeting_morning'), emoji: '☀️', hint: t(lang, 'greeting_hint_morning') };
  if (h < 17) return { text: t(lang, 'greeting_afternoon'), emoji: '🌤️', hint: t(lang, 'greeting_hint_afternoon') };
  if (h < 21) return { text: t(lang, 'greeting_dinner'), emoji: '🌙', hint: t(lang, 'greeting_hint_dinner') };
  return { text: t(lang, 'greeting_night'), emoji: '🌟', hint: t(lang, 'greeting_hint_night') };
}
