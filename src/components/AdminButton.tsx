'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdmin, type LoginResult } from '@/lib/useAdmin';
import { t, type Locale, type TranslationKey } from '@/lib/i18n';
import { Lock, LockOpen } from 'lucide-react';

interface Props {
  lang: string;
}

export default function AdminButton({ lang }: Props) {
  const locale = lang as Locale;
  const { isAdmin, loaded, login, loginWithAccount, logout } = useAdmin();
  const [showModal, setShowModal] = useState(false);
  const [usePassword, setUsePassword] = useState(false); // false = finca account (default)
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loaded) return null;

  function reset() {
    setShowModal(false);
    setUsePassword(false);
    setEmail('');
    setPass('');
    setError('');
  }

  function errorKey(r: Extract<LoginResult, { ok: false }>): TranslationKey {
    switch (r.reason) {
      case 'not_writer': return 'admin_err_not_writer';
      case 'rate_limited': return 'admin_err_rate';
      case 'unavailable': return 'admin_err_unavailable';
      default: return usePassword ? 'admin_err_password' : 'admin_err_credentials';
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = usePassword ? await login(pass) : await loginWithAccount(email, pass);
    setSubmitting(false);
    if (result.ok) {
      reset();
    } else {
      setError(t(locale, errorKey(result)));
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
            aria-label={t(locale, 'admin_logout_label')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'rgba(31,138,112,0.12)', color: 'var(--secondary)', border: '1px solid rgba(31,138,112,0.25)' }}
            title={t(locale, 'admin_logged_in_title')}
          >
            <LockOpen size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            aria-label={t(locale, 'admin_login_label')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            title={t(locale, 'admin_login_label')}
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
          onClick={e => { if (e.target === e.currentTarget) reset(); }}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl shadow-xl"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {t(locale, 'admin_login_title')}
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
              {t(locale, usePassword ? 'admin_password_login_subtitle' : 'admin_login_subtitle')}
            </p>
            <form onSubmit={handleLogin} className="space-y-3">
              {!usePassword && (
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t(locale, 'admin_email')}
                  aria-label={t(locale, 'admin_email')}
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              )}
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder={t(locale, 'admin_password')}
                aria-label={t(locale, 'admin_password')}
                autoComplete={usePassword ? 'off' : 'current-password'}
                autoFocus={usePassword}
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              {error && (
                <p className="text-xs" role="alert" style={{ color: '#e05252' }}>{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--secondary)' }}
                >
                  {submitting ? t(locale, 'admin_signing_in') : t(locale, 'admin_signin')}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t(locale, 'admin_cancel')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setUsePassword(u => !u); setError(''); setPass(''); }}
                className="block w-full text-center text-xs underline pt-1"
                style={{ color: 'var(--muted)' }}
              >
                {t(locale, usePassword ? 'admin_use_account' : 'admin_use_password')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
