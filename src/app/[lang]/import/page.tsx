'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RecipeFormData } from '@/lib/types';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { getAdminHeaders } from '@/lib/useAdmin';

type Tab = 'url' | 'text' | 'photo' | 'manual';

function RecipePreview({ recipe, onSave, saving, lang }: {
  recipe: Partial<RecipeFormData>;
  onSave: () => void;
  saving: boolean;
  lang: Locale;
}) {
  return (
    <div className="mt-6 rounded-xl border p-5" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{recipe.title}</h3>
          {recipe.description && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{recipe.description}</p>}
        </div>
        <button onClick={onSave} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0 ml-4 disabled:opacity-50"
          style={{ background: 'var(--accent)' }}>
          {saving ? t(lang, 'import_saving') : t(lang, 'import_save')}
        </button>
      </div>
      <div className="flex flex-wrap gap-4 text-xs mb-3" style={{ color: 'var(--muted)' }}>
        {recipe.cuisine && <span>🌍 {recipe.cuisine}</span>}
        {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
        {recipe.servings && <span>👤 {recipe.servings} {t(lang, 'recipe_srv')}</span>}
      </div>
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs border"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{tag}</span>
          ))}
        </div>
      )}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {t(lang, 'recipe_ingredients')} ({recipe.ingredients.length})
          </p>
          <ul className="text-sm space-y-0.5" style={{ color: 'var(--muted)' }}>
            {recipe.ingredients.slice(0, 5).map((ing, i) => (
              <li key={i}>• {[ing.amount, ing.unit, ing.item].filter(Boolean).join(' ')}</li>
            ))}
            {recipe.ingredients.length > 5 && <li>• +{recipe.ingredients.length - 5} more</li>}
          </ul>
        </div>
      )}
      {recipe.steps && recipe.steps.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {t(lang, 'recipe_instructions')} ({recipe.steps.length})
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{recipe.steps[0]?.text?.slice(0, 120)}…</p>
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const locale = lang as Locale;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState<Partial<RecipeFormData> | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'url', label: t(locale, 'import_tab_url') },
    { id: 'text', label: t(locale, 'import_tab_text') },
    { id: 'photo', label: t(locale, 'import_tab_photo') },
    { id: 'manual', label: t(locale, 'import_tab_manual') },
  ];

  async function importUrl() {
    if (!urlInput.trim()) return;
    setLoading(true); setError(''); setRecipe(null);
    try {
      const res = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecipe(data.recipe);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
    setLoading(false);
  }

  async function importText() {
    if (!textInput.trim()) return;
    setLoading(true); setError(''); setRecipe(null);
    try {
      const res = await fetch('/api/import/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecipe(data.recipe);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
    setLoading(false);
  }

  async function importPhoto(file: File) {
    setLoading(true); setError(''); setRecipe(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/import/photo', { method: 'POST', headers: { ...getAdminHeaders() }, body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecipe(data.recipe);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
    setLoading(false);
  }

  async function saveRecipe() {
    if (!recipe) return;
    setSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(recipe),
      });
      const data = await res.json();
      if (data.recipe?.id) router.push(`/${lang}/recipes/${data.recipe.id}`);
    } catch {
      setError('Save failed');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          {t(locale, 'import_title')}
        </h1>
        <Link href={`/${lang}`} className="text-sm" style={{ color: 'var(--muted)' }}>
          {t(locale, 'recipe_back')}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setRecipe(null); setError(''); }}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--secondary)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--secondary)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* URL tab */}
      {activeTab === 'url' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            {t(locale, 'import_url_label')}
          </label>
          <div className="flex gap-3">
            <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && importUrl()}
              placeholder={t(locale, 'import_url_placeholder')}
              className="flex-1 px-3 py-2.5 text-sm outline-none"
              style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }} />
            <button onClick={importUrl} disabled={loading || !urlInput.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
              {loading ? t(locale, 'import_url_importing') : t(locale, 'import_url_btn')}
            </button>
          </div>
        </div>
      )}

      {/* Text tab */}
      {activeTab === 'text' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            {t(locale, 'import_text_label')}
          </label>
          <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
            rows={10} placeholder={t(locale, 'import_text_placeholder')}
            className="w-full px-3 py-2.5 text-sm outline-none resize-y"
            style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }} />
          <button onClick={importText} disabled={loading || !textInput.trim()}
            className="mt-3 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
            {loading ? t(locale, 'import_text_parsing') : t(locale, 'import_text_btn')}
          </button>
        </div>
      )}

      {/* Photo tab */}
      {activeTab === 'photo' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            {t(locale, 'import_photo_label')}
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-[var(--secondary)]"
            style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Click to upload photo</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importPhoto(f); }} />
          {loading && (
            <p className="mt-3 text-sm text-center animate-pulse" style={{ color: 'var(--secondary)' }}>
              {t(locale, 'import_photo_analyzing')}
            </p>
          )}
        </div>
      )}

      {/* Manual tab */}
      {activeTab === 'manual' && (
        <div className="text-center py-8">
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Create a recipe from scratch</p>
          <Link href={`/${lang}/recipes/new`}
            className="inline-flex px-5 py-2.5 text-sm font-medium text-white rounded-xl"
            style={{ background: 'var(--accent)' }}>
            {t(locale, 'home_add_recipe')} →
          </Link>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {recipe && (
        <RecipePreview recipe={recipe} onSave={saveRecipe} saving={saving} lang={locale} />
      )}
    </div>
  );
}
