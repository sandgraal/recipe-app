import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRecipeById, getAllRecipeIds } from '@/lib/recipes';
import { recipeTitle, recipeDescription, localizeCuisine, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import RecipeSchema from '@/components/RecipeSchema';
import RecipeDetailClient from './RecipeDetailClient';

// Pre-render every recipe in both locales at build time; new recipes render
// on-demand (dynamicParams defaults to true) and are cached via ISR.
export const revalidate = 3600;

export async function generateStaticParams() {
  const ids = await getAllRecipeIds();
  return ids.flatMap(id => [{ lang: 'en', id }, { lang: 'es', id }]);
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; id: string }> },
): Promise<Metadata> {
  const { lang, id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) return { title: `Recipe · ${SITE_NAME}` };
  const locale = lang as Locale;
  const title = recipeTitle(recipe, locale);
  const description = recipeDescription(recipe, locale)
    || (recipe.cuisine ? `${localizeCuisine(recipe.cuisine, locale)} recipe — ${title}` : title);
  const path = `/recipes/${id}`;
  const images = recipe.image_url ? [recipe.image_url] : [];
  return {
    title: `${title} · ${SITE_NAME}`,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}${path}`,
      languages: {
        en: `${SITE_URL}/en${path}`,
        es: `${SITE_URL}/es${path}`,
        'x-default': `${SITE_URL}/en${path}`,
      },
    },
    openGraph: { title, description, url: `${SITE_URL}/${lang}${path}`, type: 'article', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function RecipeDetailPage(
  { params }: { params: Promise<{ lang: string; id: string }> },
) {
  const { lang, id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) notFound();
  return (
    <>
      <RecipeSchema recipe={recipe} lang={lang as Locale} />
      <RecipeDetailClient recipe={recipe} lang={lang} />
    </>
  );
}
