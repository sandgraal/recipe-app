import RecipeForm from '@/components/RecipeForm';
import { t, type Locale } from '@/lib/i18n';

export default async function NewRecipePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>
        {t(locale, 'home_add_recipe')}
      </h1>
      <div className="rounded-xl p-6 shadow-sm border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <RecipeForm lang={lang} />
      </div>
    </div>
  );
}
