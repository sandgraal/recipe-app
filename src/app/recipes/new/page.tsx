import RecipeForm from '@/components/RecipeForm';

export default function NewRecipePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>New Recipe</h1>
      <div className="rounded-xl p-6 shadow-sm border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <RecipeForm />
      </div>
    </div>
  );
}
