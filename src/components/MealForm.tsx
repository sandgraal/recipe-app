'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import { getAdminHeaders } from '@/lib/useAdmin';
import { normalizeName } from '@/lib/shoppingList';
import { saveMeal, validateMealDraft, type MealDraft } from '@/lib/mealsClient';

export interface MealFormInitial {
  id: string;
  slug: string;
  title: string;
  title_es: string | null;
  note: string | null;
  note_es: string | null;
  recipeIds: string[];
}

interface RecipeOption { id: string; title: string; title_es: string | null }

interface Props {
  lang: string;
  /** Present = edit this meal; absent = create a new one. */
  initial?: MealFormInitial;
  onClose: () => void;
}

const MAX_RESULTS = 8;

/** Create / edit a meal: titles, notes, web address and a searchable, re-orderable recipe picker. */
export default function MealForm({ lang, initial, onClose }: Props) {
  const locale = lang as Locale;
  const es = locale === 'es';
  const router = useRouter();
  const editing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [titleEs, setTitleEs] = useState(initial?.title_es ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [noteEs, setNoteEs] = useState(initial?.note_es ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [ids, setIds] = useState<string[]>(initial?.recipeIds ?? []);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<RecipeOption[] | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/meals/recipe-options')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => { if (live) setOptions(d.recipes as RecipeOption[]); })
      .catch(() => { if (live) setOptionsFailed(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const byId = useMemo(() => new Map((options ?? []).map(o => [o.id, o])), [options]);
  const nameOf = (o: RecipeOption | undefined) => (o ? (es ? o.title_es || o.title : o.title) : '…');

  const results = useMemo(() => {
    if (!options) return [];
    const q = normalizeName(query);
    const chosen = new Set(ids);
    return options
      .filter(o => !chosen.has(o.id))
      .filter(o => !q || normalizeName(`${o.title} ${o.title_es ?? ''}`).includes(q))
      .slice(0, MAX_RESULTS);
  }, [options, query, ids]);

  function move(i: number, d: -1 | 1) {
    setIds(prev => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const draft: MealDraft = { title, title_es: titleEs, note, note_es: noteEs, slug, recipeIds: ids };
    const invalid = validateMealDraft(draft);
    if (invalid) { setError(t(locale, invalid)); return; }

    setSaving(true);
    const result = await saveMeal(draft, editing ? initial!.id : undefined, getAdminHeaders());
    if (!result.ok) {
      setSaving(false);
      setError(t(locale, result.errorKey));
      return;
    }
    onClose();
    if (result.slug && (!editing || result.slug !== initial!.slug)) router.replace(`/${lang}/meals/${result.slug}`);
    router.refresh();
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)' } as const;
  const labelCls = 'block text-xs font-semibold mb-1';
  const iconBtn = 'inline-flex items-center justify-center w-8 h-8 border disabled:opacity-30';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form onSubmit={save} className="p-5 sm:p-6 w-full max-w-2xl my-auto" role="dialog" aria-modal="true" aria-labelledby="meal-form-title"
        style={{ background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}>
        <h2 id="meal-form-title" className="text-2xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
          {t(locale, editing ? 'meal_form_edit_title' : 'meal_form_new_title')}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="meal-title" className={labelCls} style={{ color: 'var(--muted)' }}>{t(locale, 'meal_field_title')}</label>
            <input id="meal-title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200}
              className="w-full px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="meal-title-es" className={labelCls} style={{ color: 'var(--muted)' }}>{t(locale, 'meal_field_title_es')}</label>
            <input id="meal-title-es" value={titleEs} onChange={e => setTitleEs(e.target.value)} maxLength={200}
              className="w-full px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="meal-note" className={labelCls} style={{ color: 'var(--muted)' }}>{t(locale, 'meal_field_note')}</label>
            <textarea id="meal-note" value={note} onChange={e => setNote(e.target.value)} rows={4} maxLength={5000}
              className="w-full px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="meal-note-es" className={labelCls} style={{ color: 'var(--muted)' }}>{t(locale, 'meal_field_note_es')}</label>
            <textarea id="meal-note-es" value={noteEs} onChange={e => setNoteEs(e.target.value)} rows={4} maxLength={5000}
              className="w-full px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="meal-slug" className={labelCls} style={{ color: 'var(--muted)' }}>{t(locale, 'meal_field_slug')}</label>
            <input id="meal-slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} maxLength={80}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="meal-slug-hint"
              className="w-full px-3 py-2 text-sm" style={inputStyle} />
            <p id="meal-slug-hint" className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{t(locale, 'meal_field_slug_hint')}</p>
          </div>
        </div>

        {/* Recipe picker */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase mb-2" style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
            {t(locale, 'meal_picker_label')} ({ids.length})
          </h3>

          {ids.length === 0 ? (
            <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{t(locale, 'meal_picker_empty')}</p>
          ) : (
            <ul className="space-y-1.5 mb-3">
              {ids.map((id, i) => {
                const name = nameOf(byId.get(id));
                return (
                  <li key={id} className="flex items-center gap-2 px-2 py-1.5 border"
                    style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                    <span className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text)' }}>{name}</span>
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)}
                      aria-label={t(locale, 'meal_move_up', { title: name })}
                      style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                      <ArrowUp size={14} aria-hidden="true" />
                    </button>
                    <button type="button" className={iconBtn} disabled={i === ids.length - 1} onClick={() => move(i, 1)}
                      aria-label={t(locale, 'meal_move_down', { title: name })}
                      style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                      <ArrowDown size={14} aria-hidden="true" />
                    </button>
                    <button type="button" className={iconBtn} onClick={() => setIds(prev => prev.filter(x => x !== id))}
                      aria-label={t(locale, 'meal_remove_recipe', { title: name })}
                      style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: '#e05252' }}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <input type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t(locale, 'meal_picker_search')} aria-label={t(locale, 'meal_picker_search')}
            className="w-full px-3 py-2 text-sm" style={inputStyle} />
          <div className="mt-2" aria-live="polite">
            {optionsFailed ? (
              <p className="text-sm" role="alert" style={{ color: '#e05252' }}>{t(locale, 'meal_picker_failed')}</p>
            ) : !options ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{t(locale, 'meal_picker_loading')}</p>
            ) : results.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{t(locale, 'meal_picker_no_matches')}</p>
            ) : (
              <ul className="space-y-1">
                {results.map(o => {
                  const name = nameOf(o);
                  return (
                    <li key={o.id}>
                      <button type="button" onClick={() => setIds(prev => [...prev, o.id])}
                        aria-label={t(locale, 'meal_add_recipe', { title: name })}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm border hover:opacity-80"
                        style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                        <Plus size={14} aria-hidden="true" style={{ color: 'var(--secondary)' }} />
                        <span className="min-w-0 truncate">{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {editing && (
          <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>{t(locale, 'meal_shopping_rebuild_note')}</p>
        )}
        {error && <p className="text-sm mt-4" role="alert" style={{ color: '#e05252' }}>{error}</p>}

        <div className="flex gap-3 mt-5">
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-sm)' }}>
            {saving ? t(locale, 'meal_saving') : t(locale, 'meal_save')}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)' }}>
            {t(locale, 'meal_cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
