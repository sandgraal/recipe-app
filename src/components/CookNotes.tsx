'use client';

import { useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { useCookNotes } from '@/lib/useCookNotes';
import { t, type Locale } from '@/lib/i18n';

/**
 * Personal, dated cook notes for a recipe — stored per device in localStorage.
 * Screen-only (data-no-print) since it's an editing surface.
 */
export default function CookNotes({ recipeId, lang }: { recipeId: string; lang: string }) {
  const locale = lang as Locale;
  const { notes, add, remove } = useCookNotes(recipeId);
  const [draft, setDraft] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    add(draft);
    setDraft('');
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return ''; }
  };

  return (
    <section className="mt-8" data-no-print>
      <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--accent)' }}>
        <StickyNote size={16} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>
          {t(locale, 'cooknotes_title')}
        </span>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={t(locale, 'cooknotes_placeholder')}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="self-start px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
          style={{ background: 'var(--secondary)' }}
        >
          {t(locale, 'cooknotes_add')}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{t(locale, 'cooknotes_empty')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notes.map(n => (
            <li
              key={n.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--note-bg)' }}
            >
              <div className="flex-1">
                <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>{n.text}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{fmtDate(n.at)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label={t(locale, 'cooknotes_delete')}
                className="p-1 rounded hover:opacity-70"
                style={{ color: 'var(--muted)' }}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
