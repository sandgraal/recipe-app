'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAdmin } from '@/lib/useAdmin';
import { t, type Locale } from '@/lib/i18n';
import MealForm from '@/components/MealForm';

/** "New meal" button for the meals list. Admin only (the API enforces the real check). */
export default function NewMealButton({ lang }: { lang: string }) {
  const locale = lang as Locale;
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white"
        style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-sm)' }}>
        <Plus size={14} aria-hidden="true" />
        {t(locale, 'meal_new')}
      </button>
      {open && <MealForm lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}
