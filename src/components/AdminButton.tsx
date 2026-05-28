'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/lib/useAdmin';
import { t, type Locale } from '@/lib/i18n';

interface Props {
  lang: string;
}

export default function AdminButton({ lang }: Props) {
  const locale = lang as Locale;
  const { isAdmin, loaded, login, logout } = useAdmin();
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  if (!loaded) return null;

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(user.trim(), pass);
    if (ok) {
      setShowModal(false);
      setUser('');
      setPass('');
      setError('');
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
            <span>🔓</span>
            <span className="hidden sm:inline">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            title="Admin login"
          >
            <span>🔒</span>
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
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="Username"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              {error && (
                <p className="text-xs" style={{ color: '#e05252' }}>{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'var(--secondary)' }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); setUser(''); setPass(''); }}
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
