'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';
import { Recipe } from '@/lib/types';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';

export default function EditRecipePage() {
  const { lang = 'en', id } = useParams<{ lang: string; id: string }>();
  const locale = lang as Locale;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.json())
      .then(d => { setRecipe(d.recipe); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded w-1/3" style={{ background: 'var(--border)' }} />
          <div className="h-64 rounded-xl" style={{ background: 'var(--border)' }} />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-base" style={{ color: 'var(--muted)' }}>{t(locale, 'recipe_not_found')}</p>
        <Link href={`/${lang}`} className="mt-4 inline-block text-sm" style={{ color: 'var(--accent)' }}>
          {t(locale, 'recipe_back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {t(locale, 'recipe_edit')}: {recipe.title}
        </h1>
        <Link href={`/${lang}/recipes/${id}`} className="text-sm" style={{ color: 'var(--muted)' }}>
          {t(locale, 'recipe_back')}
        </Link>
      </div>
      <div className="rounded-xl p-6 shadow-sm border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <RecipeForm initialData={recipe} recipeId={id} lang={lang} />
      </div>
    </div>
  );
}
