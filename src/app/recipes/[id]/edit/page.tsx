'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';
import { Recipe } from '@/lib/types';
import Link from 'next/link';

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
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
        <p>Recipe not found.</p>
        <Link href="/" style={{ color: 'var(--accent)' }}>← Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Edit Recipe</h1>
      <div className="rounded-xl p-6 shadow-sm border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <RecipeForm initialData={recipe} recipeId={id} />
      </div>
    </div>
  );
}
