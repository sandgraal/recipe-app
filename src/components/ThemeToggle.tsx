'use client';

import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const ICON: Record<Theme, string> = { system: '🖥️', light: '☀️', dark: '🌙' };
const LABEL_ES: Record<Theme, string> = { system: 'sistema', light: 'claro', dark: 'oscuro' };

/** Light / Dark / System theme toggle. Sets data-theme on <html> (matched by the
 *  inline script in the root layout) and persists the choice in localStorage. */
export default function ThemeToggle({ lang = 'en' }: { lang?: string }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('theme') as Theme | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = resolve(theme);
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme, mounted]);

  // Follow OS changes live while on "system".
  useEffect(() => {
    if (!mounted || theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light'; };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, mounted]);

  // Render nothing until mounted to avoid a hydration mismatch on the icon.
  if (!mounted) return null;

  const es = lang === 'es';
  const label = es
    ? `Tema: ${LABEL_ES[theme]}. Cambiar a ${LABEL_ES[NEXT[theme]]}.`
    : `Theme: ${theme}. Switch to ${NEXT[theme]}.`;

  return (
    <button type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={label}
      title={label}
      className="flex items-center justify-center w-8 h-8 rounded-full border transition-colors"
      style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--muted)' }}
    >
      <span aria-hidden="true">{ICON[theme]}</span>
    </button>
  );
}
