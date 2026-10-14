/** Pure helpers for meal (meal_groups) administration. */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return s.length <= 80 && SLUG_RE.test(s);
}

/** "Gallo Pinto & Café!" -> "gallo-pinto-and-cafe". Empty string if nothing usable is left. */
export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** True when both lists hold the same recipes (order is ignored). */
export function sameRecipeSet(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

/** Every page whose content depends on the meals, for revalidatePath. */
export function mealPaths(slugs: Array<string | null | undefined>): string[] {
  const paths = ['/en', '/es', '/en/meals', '/es/meals'];
  for (const s of new Set(slugs.filter((x): x is string => !!x))) {
    paths.push(`/en/meals/${s}`, `/es/meals/${s}`);
  }
  return paths;
}
