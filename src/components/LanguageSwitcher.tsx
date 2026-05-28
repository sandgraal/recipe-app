'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function LanguageSwitcher() {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang || 'en';
  const pathname = usePathname();

  const getAlternatePath = (targetLang: string) => {
    // Replace the locale segment: /en/... → /es/...
    return pathname.replace(new RegExp(`^/${lang}`), `/${targetLang}`);
  };

  return (
    <div
      className="flex items-center gap-0.5 text-xs font-medium"
      style={{
        border: '1px solid var(--border)',
        borderRadius: '999px',
        padding: '2px 4px',
        background: 'var(--bg)',
      }}
    >
      <Link
        href={getAlternatePath('en')}
        className="px-2 py-0.5 rounded-full transition-all"
        style={
          lang === 'en'
            ? { background: 'var(--secondary)', color: 'white' }
            : { color: 'var(--muted)' }
        }
      >
        EN
      </Link>
      <Link
        href={getAlternatePath('es')}
        className="px-2 py-0.5 rounded-full transition-all"
        style={
          lang === 'es'
            ? { background: 'var(--secondary)', color: 'white' }
            : { color: 'var(--muted)' }
        }
      >
        ES
      </Link>
    </div>
  );
}
