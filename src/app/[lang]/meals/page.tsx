import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllMeals } from '@/lib/recipes';
import { t, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import MealCard from '@/components/MealCard';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const title = `${t(locale, 'recipe_make_a_meal')} · ${SITE_NAME}`;
  const description = t(locale, 'meals_page_subtitle');
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}/meals`,
      languages: { en: `${SITE_URL}/en/meals`, es: `${SITE_URL}/es/meals`, 'x-default': `${SITE_URL}/en/meals` },
    },
    openGraph: { title, description, url: `${SITE_URL}/${lang}/meals`, type: 'website' },
  };
}

export default async function MealsIndexPage(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const locale = lang as Locale;
  const meals = await getAllMeals();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-2">
        <Link href={`/${lang}`} className="inline-flex items-center gap-1 text-sm hover:opacity-70" style={{ color: 'var(--muted)' }}>
          {t(locale, 'recipe_back')}
        </Link>
      </div>
      <h1 className="text-4xl leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {t(locale, 'recipe_make_a_meal')}
      </h1>
      <p className="mt-2 mb-8 text-base max-w-2xl" style={{ color: 'var(--muted)' }}>
        {t(locale, 'meals_page_subtitle')}
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {meals.map(m => <MealCard key={m.slug} meal={m} lang={lang} />)}
      </div>
    </div>
  );
}
