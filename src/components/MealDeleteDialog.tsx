'use client';

import { useEffect, useState } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { getAdminHeaders } from '@/lib/useAdmin';

interface Props {
  mealId: string;
  title: string;
  lang: string;
  onClose: () => void;
  /** Called after the server confirmed the delete. */
  onDeleted: () => void;
}

/** Confirm-then-delete dialog for a meal (same look as the recipe delete dialog). */
export default function MealDeleteDialog({ mealId, title, lang, onClose, onDeleted }: Props) {
  const locale = lang as Locale;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onClose]);

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/meals/${mealId}`, { method: 'DELETE', cache: 'no-store', headers: { ...getAdminHeaders() } });
      if (!res.ok) {
        setDeleting(false);
        setError(t(locale, res.status === 401 ? 'meal_save_unauthorized' : 'meal_delete_failed'));
        return;
      }
      onDeleted();
    } catch (e) {
      console.error('meal delete request failed', e);
      setDeleting(false);
      setError(t(locale, 'meal_delete_failed_conn'));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget && !deleting) onClose(); }}>
      <div className="p-6 max-w-sm w-full" role="dialog" aria-modal="true" aria-labelledby="meal-delete-title"
        style={{ background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}>
        <h3 id="meal-delete-title" className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
          {t(locale, 'meal_delete_title')}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          {t(locale, 'meal_delete_body', { title })}
        </p>
        {error && <p className="text-sm mb-4" role="alert" style={{ color: '#e05252' }}>{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: '#e05252', borderRadius: 'var(--radius-sm)' }}>
            {deleting ? t(locale, 'meal_deleting') : t(locale, 'meal_delete')}
          </button>
          <button type="button" onClick={onClose} disabled={deleting} autoFocus
            className="flex-1 px-4 py-2 text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)' }}>
            {t(locale, 'meal_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
