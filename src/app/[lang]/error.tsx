'use client';

import { useEffect } from 'react';

/**
 * Localized error boundary for the app segment. Client component (required for
 * error boundaries); reads the resolved <html lang> for EN/ES copy since route
 * params aren't available here.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('route error', error); }, [error]);
  const es = typeof document !== 'undefined' && document.documentElement.lang === 'es';

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-5" aria-hidden="true">🍳</div>
      <h1 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {es ? 'Algo salió mal' : 'Something went wrong'}
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
        {es
          ? 'No pudimos cargar esto. Vuelve a intentarlo.'
          : "We couldn't load this. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: 'var(--accent)' }}
      >
        {es ? 'Reintentar' : 'Try again'}
      </button>
    </div>
  );
}
