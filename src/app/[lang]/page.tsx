import type { Metadata } from 'next';
import { getRecipeCards } from '@/lib/recipes';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import HomeClient from './HomeClient';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const { lang } = await params;
  const isEs = lang === 'es';
  const title = isEs ? `Recetas · ${SITE_NAME}` : `Recipes · ${SITE_NAME}`;
  const description = isEs
    ? 'Una colección de recetas — inspirada en los sabores de Costa Rica y más allá.'
    : 'A personal recipe collection — inspired by the flavors of Costa Rica and beyond.';
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}`,
      languages: { en: `${SITE_URL}/en`, es: `${SITE_URL}/es`, 'x-default': `${SITE_URL}/en` },
    },
    openGraph: { title, description, url: `${SITE_URL}/${lang}`, type: 'website' },
  };
}

export default async function HomePage(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const recipes = await getRecipeCards();
  return <HomeClient recipes={recipes} lang={lang} />;
}
