'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/lib/useAdmin';
import { t, type Locale } from '@/lib/i18n';
import { Lock, LockOpen } from 'lucide-react';

interface Props {
  lang: string;
}

export default function AdminButton({ lang }: Props) {
  const locale = lang as Locale;
  const { isAdmin, loaded, login, logout } = useAdmin();
  const [showModal, setShowModal] = useState(false);
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loaded) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const ok = await login(pass);
    setSubmitting(false);
    if (ok) {
      setShowModal(false);
      setPass('');
    } else {
      setError('Invalid credentials');
    }
  }

  return (
    <>
      {/* Nav controls */}
      <div className="flex items-center gap-1">
        {isAdmin && (
          <Link href={`/${lang}/import`} className="nav-pill">
            {t(locale, 'nav_import')}
          </Link>
        )}

        {isAdmin ? (
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'rgba(31,138,112,0.12)', color: 'var(--secondary)', border: '1px solid rgba(31,138,112,0.25)' }}
            title="Logged in as admin"
          >
            <LockOpen size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            title="Admin login"
          >
            <Lock size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Login modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl shadow-xl"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Admin Login
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
              Sign in to edit, import, or delete recipes.
            </p>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              {error && (
                <p className="text-xs" style={{ color: '#e05252' }}>{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--secondary)' }}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); setPass(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
