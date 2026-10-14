import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';

export interface RelatedLink { href: string; label: string; count: number }

/**
 * Friendly page for a region or category that is valid but has no recipes (an
 * old shared link, or a value whose recipes were removed). Offers the
 * neighbours that do have recipes instead of a dead end.
 */
export default function EmptyLanding({
  lang, title, related,
}: { lang: string; title: string; related: RelatedLink[] }) {
  const locale = lang as Locale;
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {title}
      </h1>
      {related.length > 0 && (
        <>
          <p className="text-sm mt-6 mb-3" style={{ color: 'var(--muted)' }}>{t(locale, 'empty_try_instead')}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {related.map(l => (
              <li key={l.href}>
                <Link href={l.href} className="chip inline-block">{l.label} <span className="opacity-70">({l.count})</span></Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-8">
        <Link href={`/${lang}/browse`} className="text-sm font-medium" style={{ color: 'var(--secondary)' }}>
          {t(locale, 'browse_all_recipes')} →
        </Link>
      </p>
    </div>
  );
}
