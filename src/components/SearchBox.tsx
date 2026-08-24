'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';

/** Keyword search input that navigates to the shareable /search?q= page. */
export default function SearchBox({ lang, initial = '' }: { lang: string; initial?: string }) {
  const locale = lang as Locale;
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/${lang}/search?q=${encodeURIComponent(term)}` : `/${lang}/search`);
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--border)', background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
      <Search size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t(locale, 'search_page_placeholder')}
        aria-label={t(locale, 'search_page_title')}
        className="flex-1 text-base outline-none bg-transparent"
        style={{ color: 'var(--text)' }}
        autoFocus
      />
      <button type="submit" className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
        style={{ background: 'var(--accent)' }}>
        {t(locale, 'nav_search')}
      </button>
    </form>
  );
}
