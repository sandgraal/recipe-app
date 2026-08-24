import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AdminButton from '@/components/AdminButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Search } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import { SITE_URL, SITE_NAME } from '@/lib/site';

const VALID_LOCALES = ['en', 'es'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const isEs = lang === 'es';
  const title = isEs ? 'Recetas · Creaciones Colibrí' : 'Recipes · Creaciones Colibrí';
  const description = isEs
    ? 'Una colección de recetas — inspirada en los sabores de Costa Rica y más allá.'
    : 'A personal recipe collection — inspired by the flavors of Costa Rica and beyond.';
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: { siteName: SITE_NAME, locale: isEs ? 'es_ES' : 'en_US', type: 'website' },
    twitter: { card: 'summary_large_image' },
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
      {/* Set <html lang> synchronously on parse — SSG-safe, replaces a useEffect.
          (Root layout stays lang="en" to keep the tree statically generated.) */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(locale)}` }} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:text-white focus:shadow-lg"
        style={{ background: 'var(--secondary)' }}
      >
        {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
      </a>
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
                width={32}
                height={32}
                decoding="async"
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
              <Link href={`/${lang}/browse`} className="nav-pill">
                {t(locale, 'nav_browse')}
              </Link>
              <Link href={`/${lang}/meals`} className="nav-pill hidden sm:inline-flex">
                {t(locale, 'nav_meals')}
              </Link>
              <Link href={`/${lang}/identify`} className="nav-cta hidden sm:inline-flex">
                {t(locale, 'nav_pantry')}
              </Link>
              <Link href={`/${lang}/search`} className="nav-pill" aria-label={t(locale, 'nav_search')}>
                <Search size={18} aria-hidden="true" />
              </Link>
              <AdminButton lang={lang} />
              <div className="ml-2 flex items-center gap-2">
                <ThemeToggle lang={lang} />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </nav>

        {/* ── Page content ── */}
        <main id="main-content" className="flex-1">{children}</main>

        {/* ── Footer ── */}
        <footer className="mt-16 py-8" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="https://sandgraal.github.io/creaciones-colibri/img/branding/creaciones-colibri-logo-small.png"
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                  className="w-5 h-5 object-contain opacity-60"
                />
                <span
                  className="text-xs"
                  style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)' }}
                >
                  Creaciones Colibrí · Recetas
                </span>
              </div>
              <nav className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}
                aria-label={locale === 'es' ? 'Enlaces legales' : 'Legal links'}>
                <Link href={`/${lang}/privacy`} className="hover:underline">
                  {locale === 'es' ? 'Privacidad' : 'Privacy'}
                </Link>
                <Link href={`/${lang}/terms`} className="hover:underline">
                  {locale === 'es' ? 'Términos' : 'Terms'}
                </Link>
              </nav>
            </div>
            <p className="mt-4 text-xs" style={{ color: 'var(--muted)', maxWidth: '44rem' }}>
              {locale === 'es'
                ? 'Las recetas y cualquier etiqueta relacionada con la salud son solo de interés culinario y nutricional; no son consejo médico.'
                : 'Recipes and any health-related tags are for culinary and nutritional interest only — not medical advice.'}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
