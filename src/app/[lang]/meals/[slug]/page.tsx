import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getMealBySlug, getAllMealSlugs } from '@/lib/recipes';
import { t, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import MealShoppingList from '@/components/MealShoppingList';
import { UtensilsCrossed } from 'lucide-react';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllMealSlugs();
  return slugs.flatMap(slug => [{ lang: 'en', slug }, { lang: 'es', slug }]);
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; slug: string }> },
): Promise<Metadata> {
  const { lang, slug } = await params;
  const meal = await getMealBySlug(slug);
  if (!meal) return { title: `Meal · ${SITE_NAME}` };
  const locale = lang as Locale;
  const title = locale === 'es' ? meal.title_es || meal.title : meal.title;
  const noteRaw = locale === 'es' ? meal.note_es || meal.note : meal.note;
  const description = (noteRaw || '').split('\n')[0] || title;
  const path = `/meals/${slug}`;
  return {
    title: `${title} · ${SITE_NAME}`,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}${path}`,
      languages: { en: `${SITE_URL}/en${path}`, es: `${SITE_URL}/es${path}`, 'x-default': `${SITE_URL}/en${path}` },
    },
    openGraph: { title, description, url: `${SITE_URL}/${lang}${path}`, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function MealPage(
  { params }: { params: Promise<{ lang: string; slug: string }> },
) {
  const { lang, slug } = await params;
  const meal = await getMealBySlug(slug);
  if (!meal) notFound();
  const locale = lang as Locale;
  const es = locale === 'es';

  const title = es ? meal.title_es || meal.title : meal.title;
  const note = es ? meal.note_es || meal.note : meal.note;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4" data-no-print>
        <Link href={`/${lang}`} className="inline-flex items-center gap-1 text-sm hover:opacity-70" style={{ color: 'var(--muted)' }}>
          {t(locale, 'recipe_back')}
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--accent)' }}>
        <UtensilsCrossed size={16} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>{t(locale, 'recipe_make_a_meal')}</span>
      </div>
      <h1 className="text-4xl leading-tight mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {title}
      </h1>
      {note && (
        <p className="text-base leading-relaxed whitespace-pre-line mb-8 max-w-3xl" style={{ color: 'var(--text)' }}>{note}</p>
      )}

      {/* The recipes in this meal */}
      <h2 className="text-xs font-semibold uppercase mb-3" style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
        {t(locale, 'meal_recipes')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {meal.recipes.map(r => (
          <Link key={r.id} href={`/${lang}/recipes/${r.id}`}
            className="group flex flex-col overflow-hidden border transition-shadow hover:shadow-md"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div className="relative w-full overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16 / 10', background: 'var(--bg)' }}>
              {r.image_url
                ? <Image src={r.image_url} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 360px" />
                : <UtensilsCrossed size={28} aria-hidden="true" style={{ color: 'var(--muted)' }} />}
            </div>
            <div className="p-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {es ? r.title_es || r.title : r.title}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Consolidated shopping list */}
      {meal.shoppingList.length > 0 && (
        <MealShoppingList aisles={meal.shoppingList} lang={lang} slug={meal.slug} title={title} />
      )}
    </div>
  );
}
