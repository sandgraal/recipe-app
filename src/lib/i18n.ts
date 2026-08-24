import type { Recipe } from './types';
import { RECIPE_CATEGORY_ES, REGION_ES, DIFFICULTY_ES, DIETARY_ES } from './taxonomy';

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

// ── UI string dictionary ─────────────────────────────────────────────────────

export const translations = {
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
    recipe_make_a_meal: 'Make it a meal',
    meal_see_full: 'See the full meal & shopping list',
    meal_recipes: 'Recipes',
    meal_shopping_list: 'Shopping list',
    meal_copy: 'Copy',
    meal_copied: 'Copied!',
    meal_n_recipes: '{n} recipes',
    meals_tagline: 'Curated menus with a combined shopping list',
    meals_see_all: 'See all meals',
    meals_page_subtitle: 'Cook a whole meal from the collection — each with timing notes and one combined, aisle-sorted shopping list.',
    recipe_servings: '{n} servings',
    recipe_original: '↗ Original recipe',
    recipe_no_ingredients: 'No ingredients listed.',
    recipe_no_steps: 'No steps listed.',
    recipe_delete_title: 'Delete Recipe?',
    recipe_delete_body: '"{title}" will be permanently deleted.',
    recipe_delete_cancel: 'Cancel',
    recipe_deleting: 'Deleting…',
    recipe_delete_failed: 'Could not delete the recipe. Please try again.',
    recipe_delete_failed_conn: 'Could not delete — check your connection and try again.',
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
    recipe_make_a_meal: 'Hazlo una comida completa',
    meal_see_full: 'Ver la comida completa y la lista de compras',
    meal_recipes: 'Recetas',
    meal_shopping_list: 'Lista de compras',
    meal_copy: 'Copiar',
    meal_copied: '¡Copiado!',
    meal_n_recipes: '{n} recetas',
    meals_tagline: 'Menús listos con lista de compras combinada',
    meals_see_all: 'Ver todas las comidas',
    meals_page_subtitle: 'Cociná una comida completa de la colección — cada una con notas de tiempos y una sola lista de compras combinada y ordenada por pasillo.',
    recipe_servings: '{n} porciones',
    recipe_original: '↗ Receta original',
    recipe_no_ingredients: 'Sin ingredientes.',
    recipe_no_steps: 'Sin instrucciones.',
    recipe_delete_title: '¿Eliminar receta?',
    recipe_delete_body: '"{title}" se eliminará permanentemente.',
    recipe_delete_cancel: 'Cancelar',
    recipe_deleting: 'Eliminando…',
    recipe_delete_failed: 'No se pudo eliminar la receta. Inténtalo de nuevo.',
    recipe_delete_failed_conn: 'No se pudo eliminar: revisa tu conexión e inténtalo de nuevo.',
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
  package: 'paquete', packages: 'paquetes', pkg: 'paquete',
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

// ── Pantry category / ingredient / cuisine / tag localisation ─────────────────
// The pantry stores and matches ingredients in English; these maps only affect
// what the Spanish UI *displays*. English values are preserved for matching.

const CATEGORY_ES: Record<string, string> = {
  'Proteins': 'Proteínas',
  'Beans & Legumes': 'Frijoles y Legumbres',
  'Vegetables': 'Verduras',
  'Fruits': 'Frutas',
  'Grains & Pasta': 'Granos y Pastas',
  'Dairy & Eggs': 'Lácteos y Huevos',
  'Herbs & Spices': 'Hierbas y Especias',
  'Pantry Staples': 'Despensa Básica',
};

const INGREDIENT_ES: Record<string, string> = {
  // Proteins
  'chicken breast': 'pechuga de pollo', 'chicken thighs': 'muslos de pollo',
  'whole chicken': 'pollo entero', 'ground chicken': 'pollo molido',
  'ground beef': 'carne molida', 'ground turkey': 'pavo molido',
  'ground pork': 'cerdo molido', 'steak': 'bistec', 'beef roast': 'carne para asar',
  'pork chops': 'chuletas de cerdo', 'pork tenderloin': 'lomo de cerdo',
  'pork shoulder': 'paleta de cerdo', 'ribs': 'costillas', 'ham': 'jamón',
  'bacon': 'tocino', 'sausage': 'salchicha', 'chorizo': 'chorizo',
  'hot dogs': 'salchichas (hot dogs)', 'salmon': 'salmón', 'shrimp': 'camarones',
  'tuna': 'atún', 'cod': 'bacalao', 'tilapia': 'tilapia', 'corvina': 'corvina',
  'white fish': 'pescado blanco', 'crab': 'cangrejo', 'scallops': 'vieiras',
  'eggs': 'huevos', 'tofu': 'tofu', 'tempeh': 'tempeh', 'seitan': 'seitán',
  'turkey': 'pavo', 'lamb': 'cordero', 'veal': 'ternera', 'deli meat': 'fiambres',
  // Beans & Legumes
  'black beans': 'frijoles negros', 'kidney beans': 'frijoles rojos',
  'pinto beans': 'frijoles pintos', 'white beans': 'frijoles blancos',
  'cannellini beans': 'frijoles cannellini', 'navy beans': 'frijoles navy',
  'garbanzo beans': 'garbanzos', 'chickpeas': 'garbanzos', 'lentils': 'lentejas',
  'red lentils': 'lentejas rojas', 'green lentils': 'lentejas verdes',
  'split peas': 'arvejas partidas', 'black-eyed peas': 'frijoles carita',
  'lima beans': 'frijoles lima', 'refried beans': 'frijoles molidos',
  'red beans': 'frijoles colorados', 'edamame': 'edamame',
  // Vegetables
  'onion': 'cebolla', 'red onion': 'cebolla morada', 'green onion': 'cebollín',
  'shallot': 'chalote', 'leek': 'puerro', 'garlic': 'ajo', 'ginger': 'jengibre',
  'tomato': 'tomate', 'cherry tomatoes': 'tomates cherry', 'bell pepper': 'chile dulce',
  'red pepper': 'pimiento rojo', 'jalapeño': 'jalapeño', 'serrano': 'serrano',
  'poblano': 'poblano', 'chili pepper': 'chile picante', 'spinach': 'espinaca',
  'broccoli': 'brócoli', 'carrot': 'zanahoria', 'celery': 'apio',
  'zucchini': 'calabacín', 'squash': 'calabaza', 'butternut squash': 'calabaza butternut',
  'mushrooms': 'hongos', 'potato': 'papa', 'sweet potato': 'camote',
  'cucumber': 'pepino', 'lettuce': 'lechuga', 'romaine': 'lechuga romana',
  'arugula': 'rúcula', 'kale': 'col rizada', 'chard': 'acelga', 'corn': 'maíz',
  'green beans': 'vainicas', 'peas': 'arvejas', 'snap peas': 'arvejas dulces',
  'eggplant': 'berenjena', 'cauliflower': 'coliflor', 'cabbage': 'repollo',
  'napa cabbage': 'repollo napa', 'brussels sprouts': 'repollitos de Bruselas',
  'asparagus': 'espárragos', 'beets': 'remolacha', 'radish': 'rábano',
  'turnip': 'nabo', 'artichoke': 'alcachofa', 'okra': 'okra', 'fennel': 'hinojo',
  'bok choy': 'bok choy', 'pumpkin': 'ayote', 'plantain': 'plátano',
  'green plantain': 'plátano verde', 'yuca': 'yuca', 'cassava': 'mandioca',
  'chayote': 'chayote', 'heart of palm': 'palmito', 'taro': 'malanga', 'ayote': 'ayote',
  // Fruits
  'lemon': 'limón amarillo', 'lime': 'limón', 'orange': 'naranja',
  'grapefruit': 'toronja', 'avocado': 'aguacate', 'mango': 'mango', 'apple': 'manzana',
  'pear': 'pera', 'banana': 'banano', 'strawberries': 'fresas',
  'blueberries': 'arándanos', 'raspberries': 'frambuesas', 'blackberries': 'moras',
  'grapes': 'uvas', 'pineapple': 'piña', 'peach': 'durazno', 'plum': 'ciruela',
  'cherries': 'cerezas', 'watermelon': 'sandía', 'cantaloupe': 'melón', 'kiwi': 'kiwi',
  'pomegranate': 'granada', 'cranberries': 'arándanos rojos', 'raisins': 'pasas',
  'dates': 'dátiles', 'coconut': 'coco', 'coconut milk': 'leche de coco',
  'lime juice': 'jugo de limón', 'lemon juice': 'jugo de limón amarillo',
  'papaya': 'papaya', 'guava': 'guayaba', 'passion fruit': 'maracuyá',
  'soursop': 'guanábana', 'tamarind': 'tamarindo', 'starfruit': 'carambola',
  // Grains & Pasta
  'white rice': 'arroz blanco', 'brown rice': 'arroz integral',
  'jasmine rice': 'arroz jazmín', 'basmati rice': 'arroz basmati',
  'arborio rice': 'arroz arborio', 'pasta': 'pasta', 'spaghetti': 'espagueti',
  'penne': 'penne', 'macaroni': 'macarrones', 'lasagna noodles': 'láminas de lasaña',
  'egg noodles': 'fideos de huevo', 'rice noodles': 'fideos de arroz', 'ramen': 'ramen',
  'quinoa': 'quinoa', 'farro': 'farro', 'barley': 'cebada', 'bulgur': 'bulgur',
  'bread': 'pan', 'baguette': 'baguette', 'pita': 'pan pita', 'naan': 'pan naan',
  'tortillas': 'tortillas', 'corn tortillas': 'tortillas de maíz', 'flour': 'harina',
  'all-purpose flour': 'harina todo uso', 'whole wheat flour': 'harina integral',
  'cornmeal': 'harina de maíz', 'masa harina': 'masa harina', 'bread crumbs': 'pan rallado',
  'panko': 'panko', 'oats': 'avena', 'couscous': 'cuscús', 'polenta': 'polenta',
  'crackers': 'galletas saladas',
  // Dairy & Eggs
  'butter': 'mantequilla', 'milk': 'leche', 'whole milk': 'leche entera',
  'almond milk': 'leche de almendras', 'oat milk': 'leche de avena',
  'heavy cream': 'crema espesa', 'half and half': 'media crema', 'sour cream': 'natilla',
  'yogurt': 'yogur', 'greek yogurt': 'yogur griego', 'cheddar': 'queso cheddar',
  'parmesan': 'queso parmesano', 'mozzarella': 'mozzarella', 'cream cheese': 'queso crema',
  'feta': 'queso feta', 'ricotta': 'ricotta', 'cottage cheese': 'queso cottage',
  'goat cheese': 'queso de cabra', 'swiss cheese': 'queso suizo',
  'monterey jack': 'queso monterey jack', 'queso fresco': 'queso fresco',
  'gruyere': 'gruyere', 'blue cheese': 'queso azul',
  // Herbs & Spices
  'basil': 'albahaca', 'oregano': 'orégano', 'thyme': 'tomillo', 'rosemary': 'romero',
  'sage': 'salvia', 'dill': 'eneldo', 'mint': 'menta', 'cilantro': 'culantro',
  'culantro': 'culantro coyote', 'parsley': 'perejil', 'chives': 'cebollino',
  'tarragon': 'estragón', 'bay leaf': 'hoja de laurel', 'cumin': 'comino',
  'coriander': 'cilantro en grano', 'paprika': 'paprika', 'smoked paprika': 'paprika ahumada',
  'chili powder': 'chile en polvo', 'cinnamon': 'canela', 'nutmeg': 'nuez moscada',
  'allspice': 'pimienta de Jamaica', 'cloves': 'clavos de olor', 'cardamom': 'cardamomo',
  'turmeric': 'cúrcuma', 'garlic powder': 'ajo en polvo', 'onion powder': 'cebolla en polvo',
  'curry powder': 'curry en polvo', 'garam masala': 'garam masala',
  'italian seasoning': 'sazón italiano', 'red pepper flakes': 'hojuelas de chile',
  'black pepper': 'pimienta negra', 'white pepper': 'pimienta blanca', 'cayenne': 'cayena',
  'chili flakes': 'hojuelas de chile picante', 'saffron': 'azafrán',
  'fennel seeds': 'semillas de hinojo', 'mustard seeds': 'semillas de mostaza',
  'sesame seeds': 'semillas de ajonjolí', 'vanilla': 'vainilla',
  'vanilla extract': 'extracto de vainilla', 'achiote': 'achiote',
  // Pantry Staples
  'olive oil': 'aceite de oliva', 'vegetable oil': 'aceite vegetal',
  'canola oil': 'aceite de canola', 'coconut oil': 'aceite de coco',
  'sesame oil': 'aceite de ajonjolí', 'salt': 'sal', 'sea salt': 'sal marina',
  'sugar': 'azúcar', 'brown sugar': 'azúcar morena', 'powdered sugar': 'azúcar en polvo',
  'panela': 'tapa de dulce', 'soy sauce': 'salsa de soya', 'tamari': 'tamari',
  'vinegar': 'vinagre', 'white vinegar': 'vinagre blanco',
  'apple cider vinegar': 'vinagre de manzana', 'balsamic vinegar': 'vinagre balsámico',
  'rice vinegar': 'vinagre de arroz', 'red wine vinegar': 'vinagre de vino tinto',
  'hot sauce': 'salsa picante', 'sriracha': 'sriracha', 'tomato paste': 'pasta de tomate',
  'canned tomatoes': 'tomates enlatados', 'crushed tomatoes': 'tomates triturados',
  'tomato sauce': 'salsa de tomate', 'salsa': 'salsa', 'broth': 'caldo',
  'chicken broth': 'caldo de pollo', 'beef broth': 'caldo de res',
  'vegetable broth': 'caldo de verduras', 'stock': 'fondo', 'honey': 'miel',
  'maple syrup': 'jarabe de maple', 'molasses': 'melaza', 'condensed milk': 'leche condensada',
  'mustard': 'mostaza', 'dijon mustard': 'mostaza dijon', 'mayonnaise': 'mayonesa',
  'ketchup': 'ketchup', 'bbq sauce': 'salsa BBQ', 'worcestershire sauce': 'salsa inglesa',
  'salsa lizano': 'salsa Lizano', 'fish sauce': 'salsa de pescado',
  'oyster sauce': 'salsa de ostras', 'hoisin sauce': 'salsa hoisin',
  'peanut butter': 'mantequilla de maní', 'tahini': 'tahini', 'cornstarch': 'maicena',
  'baking soda': 'bicarbonato de sodio', 'baking powder': 'polvo de hornear',
  'yeast': 'levadura', 'cocoa powder': 'cocoa en polvo',
  'chocolate chips': 'chispas de chocolate', 'nuts': 'nueces', 'almonds': 'almendras',
  'walnuts': 'nueces de Castilla', 'peanuts': 'maní', 'cashews': 'marañones',
  'pine nuts': 'piñones',
};

const CUISINE_ES: Record<string, string> = {
  'costa rican': 'Costarricense',
  'costa rican (caribbean)': 'Costarricense (Caribe)',
  'costa rican (chinese)': 'Costarricense (China)',
  'caribbean': 'Caribeña',
  'italian': 'Italiana', 'mexican': 'Mexicana', 'peruvian': 'Peruana',
  'spanish': 'Española', 'american': 'Estadounidense', 'korean': 'Coreana',
  'chinese': 'China', 'thai': 'Tailandesa', 'japanese': 'Japonesa',
  'vietnamese': 'Vietnamita', 'colombian': 'Colombiana', 'nicaraguan': 'Nicaragüense',
  'french': 'Francesa', 'indian': 'India', 'filipino': 'Filipina',
  'middle eastern': 'Medio Oriente', 'mediterranean': 'Mediterránea',
  'brazilian': 'Brasileña', 'west african': 'Africana Occidental', 'global': 'Global',
};

const TAG_ES: Record<string, string> = {
  'mains': 'Platos Fuertes', 'soups': 'Sopas', 'soup': 'Sopa', 'desserts': 'Postres',
  'breakfast': 'Desayuno', 'lunch': 'Almuerzo', 'sides': 'Acompañamientos',
  'snacks': 'Bocadillos', 'appetizers': 'Entradas', 'rice': 'Arroz', 'beans': 'Frijoles',
  'chicken': 'Pollo', 'beef': 'Res', 'pork': 'Cerdo', 'seafood': 'Mariscos',
  'vegetarian': 'Vegetariano', 'costa rican': 'Costarricense', 'caribbean': 'Caribe',
  'drinks': 'Bebidas', 'holiday': 'Festivo', 'cake': 'Pastel', 'bread': 'Pan',
  'candy': 'Dulces', 'coconut': 'Coco', 'corn': 'Maíz', 'cheese': 'Queso',
  'masa': 'Masa', 'pasta': 'Pasta', 'chinese': 'China', 'noodles': 'Fideos',
  'world kitchen': 'Cocina del Mundo', 'functional foods': 'Comida Funcional',
  'anti-inflammatory': 'Antiinflamatorio', 'gut health': 'Salud Digestiva',
  'heart healthy': 'Saludable para el Corazón', 'immune': 'Inmunidad',
};

export function localizeCategory(category: string, lang: Locale): string {
  if (lang !== 'es') return category;
  return CATEGORY_ES[category] ?? category;
}

export function localizeIngredient(item: string, lang: Locale): string {
  if (lang !== 'es' || !item) return item;
  return INGREDIENT_ES[item.trim().toLowerCase()] ?? item;
}

export function localizeCuisine(cuisine: string | null | undefined, lang: Locale): string {
  if (!cuisine) return '';
  if (lang !== 'es') return cuisine;
  return CUISINE_ES[cuisine.trim().toLowerCase()] ?? cuisine;
}

export function localizeTag(tag: string, lang: Locale): string {
  if (lang !== 'es' || !tag) return tag;
  return TAG_ES[tag.trim().toLowerCase()] ?? tag;
}

// ── Structured taxonomy localisation ──────────────────────────────────────────
// Controlled vocab (category/region/difficulty/dietary) is stored in English and
// localized at render time — no per-recipe Spanish columns. The label maps are
// the single source of truth in src/lib/taxonomy.ts. Unknown values (e.g. a
// free-text region not in the seed list) pass through unchanged.

export function localizeRecipeCategory(category: string | null | undefined, lang: Locale): string {
  if (!category) return '';
  if (lang !== 'es') return category;
  return RECIPE_CATEGORY_ES[category.trim().toLowerCase()] ?? category;
}

export function localizeRegion(region: string | null | undefined, lang: Locale): string {
  if (!region) return '';
  if (lang !== 'es') return region;
  return REGION_ES[region.trim().toLowerCase()] ?? region;
}

export function localizeDifficulty(difficulty: string | null | undefined, lang: Locale): string {
  if (!difficulty) return '';
  if (lang !== 'es') return difficulty;
  return DIFFICULTY_ES[difficulty.trim().toLowerCase()] ?? difficulty;
}

export function localizeDietary(flag: string | null | undefined, lang: Locale): string {
  if (!flag) return '';
  if (lang !== 'es') return flag;
  return DIETARY_ES[flag.trim().toLowerCase()] ?? flag;
}

// ── Greeting helper ───────────────────────────────────────────────────────────

export function getGreeting(lang: Locale) {
  const h = new Date().getHours();
  if (h < 12) return { text: t(lang, 'greeting_morning'), emoji: '☀️', hint: t(lang, 'greeting_hint_morning') };
  if (h < 17) return { text: t(lang, 'greeting_afternoon'), emoji: '🌤️', hint: t(lang, 'greeting_hint_afternoon') };
  if (h < 21) return { text: t(lang, 'greeting_dinner'), emoji: '🌙', hint: t(lang, 'greeting_hint_dinner') };
  return { text: t(lang, 'greeting_night'), emoji: '🌟', hint: t(lang, 'greeting_hint_night') };
}
