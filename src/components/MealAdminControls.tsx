'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/useAdmin';
import { t, type Locale } from '@/lib/i18n';
import MealForm, { type MealFormInitial } from '@/components/MealForm';
import MealDeleteDialog from '@/components/MealDeleteDialog';

/** Edit + Delete buttons on a meal page. Renders nothing unless signed in as admin
 *  (the API enforces the real check; this only hides the controls). */
export default function MealAdminControls({ meal, displayTitle, lang }: { meal: MealFormInitial; displayTitle: string; lang: string }) {
  const locale = lang as Locale;
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <div className="flex items-center gap-2 mb-4" data-no-print>
        <button type="button" onClick={() => setEditing(true)}
          className="px-3 py-1.5 text-sm font-medium border"
          style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text)' }}>
          {t(locale, 'meal_edit')}
        </button>
        <button type="button" onClick={() => setDeleting(true)}
          className="px-3 py-1.5 text-sm font-medium text-white"
          style={{ borderRadius: 'var(--radius-sm)', background: '#e05252' }}>
          {t(locale, 'meal_delete')}
        </button>
      </div>

      {editing && <MealForm lang={lang} initial={meal} onClose={() => setEditing(false)} />}
      {deleting && (
        <MealDeleteDialog
          mealId={meal.id} title={displayTitle} lang={lang}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            // Back to the list, and drop the router cache so the deleted meal doesn't linger.
            router.push(`/${lang}/meals`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
