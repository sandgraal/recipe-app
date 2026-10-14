'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useAdmin } from '@/lib/useAdmin';
import { t, type Locale } from '@/lib/i18n';
import MealDeleteDialog from '@/components/MealDeleteDialog';

/** Small delete button laid over a meal card. Admin only. Sits next to (not inside)
 *  the card's link so clicking it never navigates. */
export default function MealCardDelete({ mealId, title, lang }: { mealId: string; title: string; lang: string }) {
  const locale = lang as Locale;
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label={t(locale, 'meal_delete_card_label', { title })} title={t(locale, 'meal_delete')}
        className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-9 h-9 text-white"
        style={{ background: 'rgba(224,82,82,0.92)', borderRadius: '9999px' }}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
      {open && (
        <MealDeleteDialog mealId={mealId} title={title} lang={lang}
          onClose={() => setOpen(false)}
          onDeleted={() => { setOpen(false); router.refresh(); }} />
      )}
    </>
  );
}
