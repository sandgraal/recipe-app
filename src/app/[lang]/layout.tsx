import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LangSync from '@/components/LangSync';
import AdminButton from '@/components/AdminButton';
import { t, type Locale } from '@/lib/i18n';

const VALID_LOCALES = ['en', 'es'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const isEs = lang === 'es';
  return {
    title: isEs ? 'Recetas · Creaciones Colibrí' : 'Recipes · Creaciones Colibrí',
    description: isEs
      ? 'Una colección de recetas — inspirada en los sabores de Costa Rica y más allá.'
      : 'A personal recipe collection — inspired by the flavors of Costa Rica and beyond.',
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!VALID_LOCALES.includes(lang)) notFound();
  const locale = lang as Locale;

  return (
    <>
      <LangSync lang={lang} />
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        {/* ── Nav ── */}
        <nav
          className="sticky top-0 z-50 backdrop-blur-sm"
          style={{
            background: 'rgba(253,248,243,0.88)',
            borderBottom: '1px solid var(--border)',
            boxShadow: '0 1px 0 var(--border)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Brand */}
            <Link
              href={`/${lang}`}
              className="flex items-center gap-2.5"
              aria-label="Creaciones Colibrí Recipes"
            >
              <img
                src="https://sandgraal.github.io/creaciones-colibri/img/branding/creaciones-colibri-logo-small.png"
                alt=""
                className="w-8 h-8 object-contain"
              />
              <span
                className="text-xl leading-none"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--secondary)', fontWeight: 500 }}
              >
                Recetas
              </span>
            </Link>

            {/* Nav links + language switcher */}
            <div className="flex items-center gap-1">
              <Link href={`/${lang}`} className="nav-pill">
                {t(locale, 'nav_browse')}
              </Link>
              <Link href={`/${lang}/identify`} className="nav-cta hidden sm:inline-flex">
                {t(locale, 'nav_pantry')}
              </Link>
              <AdminButton lang={lang} />
              <div className="ml-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </nav>

        {/* ── Page content ── */}
        <main className="flex-1">{children}</main>

        {/* ── Footer ── */}
        <footer className="mt-16 py-8" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="https://sandgraal.github.io/creaciones-colibri/img/branding/creaciones-colibri-logo-small.png"
                alt=""
                className="w-5 h-5 object-contain opacity-60"
              />
              <span
                className="text-xs"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)' }}
              >
                Creaciones Colibrí · Recetas
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
