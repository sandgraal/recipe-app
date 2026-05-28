'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeFormData } from '@/lib/types';
import Link from 'next/link';

type Tab = 'url' | 'text' | 'photo' | 'manual';

function RecipePreview({ recipe, onSave, saving }: {
  recipe: Partial<RecipeFormData>;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-6 rounded-xl border p-5" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{recipe.title}</h3>
          {recipe.description && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{recipe.description}</p>}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0 ml-4 disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? 'Saving...' : 'Save to My Recipes'}
        </button>
      </div>
      <div className="flex flex-wrap gap-4 text-xs mb-3" style={{ color: 'var(--muted)' }}>
        {recipe.cuisine && <span>🌍 {recipe.cuisine}</span>}
        {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
        {recipe.servings && <span>👤 {recipe.servings} servings</span>}
      </div>
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full text-xs border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{t}</span>
          ))}
        </div>
      )}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Ingredients ({recipe.ingredients.length})</p>
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
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>Steps ({recipe.steps.length})</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{recipe.steps[0]?.text?.slice(0, 120)}...</p>
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<Partial<RecipeFormData> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setParsed(null);
  }

  async function handleImport() {
    setError('');
    setParsed(null);
    setLoading(true);
    try {
      let res: Response;
      if (tab === 'url') {
        res = await fetch('/api/import/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
      } else if (tab === 'text') {
        res = await fetch('/api/import/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
      } else {
        const fd = new FormData();
        fd.append('image', photoFile!);
        res = await fetch('/api/import/photo', { method: 'POST', body: fd });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setParsed(data.recipe);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/recipes/${data.recipe.id}`);
    } else {
      setError('Failed to save recipe');
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'url', label: 'From URL', icon: '🔗' },
    { id: 'text', label: 'Paste Text', icon: '📋' },
    { id: 'photo', label: 'Photo', icon: '📷' },
    { id: 'manual', label: 'Manual Entry', icon: '✏️' },
  ];

  const canImport =
    (tab === 'url' && url.trim()) ||
    (tab === 'text' && text.trim()) ||
    (tab === 'photo' && photoFile);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Import Recipe</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Import from a URL, paste text, or take a photo of a recipe card.</p>

      {/* Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setParsed(null); setError(''); }}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderBottomColor: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {tab === 'url' && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Recipe URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.allrecipes.com/recipe/..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-4"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              onKeyDown={e => e.key === 'Enter' && canImport && !loading && handleImport()}
            />
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              Works with AllRecipes, NYT Cooking, Serious Eats, Food Network, and more.
            </p>
          </div>
        )}

        {tab === 'text' && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Recipe Text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste any recipe text here — from an email, a book, a website..."
              rows={8}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-4"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
        )}

        {tab === 'photo' && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
            {photoPreview ? (
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Recipe photo" className="w-full max-h-64 object-contain rounded-lg border" style={{ borderColor: 'var(--border)' }} />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(''); setParsed(null); }} className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                  Remove photo
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 hover:opacity-70 transition-opacity mb-4"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-4xl">📷</span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Tap to take photo or choose image</span>
              </button>
            )}
          </div>
        )}

        {tab === 'manual' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✏️</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Enter Recipe Manually</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Fill in all the details yourself.</p>
            <Link
              href="/recipes/new"
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white inline-block"
              style={{ background: 'var(--accent)' }}
            >
              Open Recipe Form
            </Link>
          </div>
        )}

        {tab !== 'manual' && (
          <button
            onClick={handleImport}
            disabled={!canImport || loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {tab === 'url' ? 'Fetching & parsing...' : tab === 'photo' ? 'Extracting recipe...' : 'Parsing recipe...'}
              </span>
            ) : (
              tab === 'url' ? 'Import from URL' : tab === 'photo' ? 'Extract Recipe from Photo' : 'Parse & Import'
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: '#fff0f0', color: '#c53030' }}>
            {error}
          </div>
        )}
      </div>

      {/* Preview */}
      {parsed && (
        <RecipePreview recipe={parsed} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}
