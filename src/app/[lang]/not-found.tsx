import Link from 'next/link';

/**
 * Localized 404. Rendered inside the [lang] layout; params aren't available in
 * not-found, so links are language-agnostic (root) and copy is bilingual.
 */
export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-5" aria-hidden="true">🧺</div>
      <h1 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        Not found · No encontrada
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
        This page doesn&rsquo;t exist. / Esta página no existe.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white inline-block"
        style={{ background: 'var(--accent)' }}
      >
        My Cookbook · Mi Recetario
      </Link>
    </div>
  );
}
