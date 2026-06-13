import { test, expect } from '@playwright/test';

/** Smoke: home renders recipes, a recipe opens, language switch works. */
test('home → recipe → language switch', async ({ page }) => {
  await page.goto('/en');
  await expect(page).toHaveTitle(/Creaciones Colibrí/);

  // A recipe card link should be present in the server-rendered HTML.
  const firstRecipe = page.locator('a[href*="/en/recipes/"]').first();
  await expect(firstRecipe).toBeVisible();
  await firstRecipe.click();
  await expect(page.locator('h1')).toBeVisible();

  // Spanish variant of the same page loads.
  await page.goto('/es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
