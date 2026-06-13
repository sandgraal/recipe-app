'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/lib/types';
import {
  t, formatTime, localizeUnit, localizeCuisine, type Locale,
  recipeTitle, recipeDescription, recipeNotes, recipeSteps,
  recipeIngredientItem, recipeTags, hasSpanishTranslation,
} from '@/lib/i18n';
import { useAdmin, getAdminHeaders } from '@/lib/useAdmin';

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractMinutes(text: string): number | null {
  const m = text.match(/(\d+)\s*(?:to\s*\d+\s*)?(?:min(?:ute)?s?|hrs?|hours?)/i);
  if (!m) return null;
  const n = parseInt(m[1]);
  return /hours?|hrs?/i.test(m[0]) ? n * 60 : n;
}

function scaleAmount(amount: string, multiplier: number): string {
  if (!amount || multiplier === 1) return amount;
  const fractions: Record<string, number> = { '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 };
  let val = amount.trim();
  for (const [sym, num] of Object.entries(fractions)) val = val.replace(sym, String(num));
  const parts = val.split(/\s+/);
  let total = 0;
  for (const p of parts) {
    if (p.includes('/')) {
      const [n, d] = p.split('/').map(Number);
      total += n / d;
    } else {
      const n = parseFloat(p);
      if (!isNaN(n)) total += n;
    }
  }
  if (!total) return amount;
  const scaled = total * multiplier;
  const rounded = Math.round(scaled * 8) / 8;
  if (rounded === Math.floor(rounded)) return String(rounded);
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracStr = frac < 0.2 ? '⅛' : frac < 0.4 ? '¼' : frac < 0.6 ? '½' : frac < 0.9 ? '¾' : '';
  return whole > 0 ? `${whole}${fracStr}` : fracStr || String(rounded.toFixed(1));
}

// ── Timer ────────────────────────────────────────────────────────────────────

function StepTimer({ minutes }: { minutes: number }) {
  const [secs, setSecs] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && secs > 0) {
      interval.current = setInterval(() => setSecs(s => s - 1), 1000);
    } else {
      if (interval.current) clearInterval(interval.current);
    }
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [running, secs]);

  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  const pct = (secs / (minutes * 60)) * 100;
  const done = secs === 0;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium"
      style={{ background: done ? '#dcfce7' : 'var(--bg)', border: `1.5px solid ${done ? '#22c55e' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: done ? '#166534' : 'var(--muted)' }}>
      <svg width="28" height="6" viewBox="0 0 28 6">
        <rect x="0" y="1" width="28" height="4" rx="2" fill="var(--border)" />
        <rect x="0" y="1" width={28 * (1 - pct / 100)} height="4" rx="2" fill={done ? '#22c55e' : 'var(--secondary)'} />
      </svg>
      <span className="font-mono">{done ? '✓ Done' : `${m}:${s}`}</span>
      {!done && (
        <button onClick={() => setRunning(r => !r)}
          className="px-1.5 py-0.5 rounded text-white text-xs"
          style={{ background: running ? '#f16745' : 'var(--secondary)' }}>
          {running ? '⏸' : '▶'}
        </button>
      )}
      {!running && secs < minutes * 60 && (
        <button onClick={() => { setSecs(minutes * 60); setRunning(false); }}
          className="opacity-50 hover:opacity-100 text-xs">↺</button>
      )}
    </div>
  );
}

// ── AI Chat ──────────────────────────────────────────────────────────────────

function RecipeChat({ recipe, lang }: { recipe: Recipe; lang: Locale }) {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function ask() {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/recipe-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, recipe, lang }),
      });
      const data = await res.json();
      if (!res.ok || !data?.answer) throw new Error();
      setMsgs(m => [...m, { role: 'ai', text: data.answer }]);
      setMsgs(m => [...m, { role: 'ai', text: t(lang, 'chat_error') }]);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  return (
    <div className="mt-8 border" style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <span style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>🤖</span>
        <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          {t(lang, 'chat_title')}
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>{t(lang, 'chat_subtitle')}</span>
      </div>
      {msgs.length > 0 && (
        <div className="px-4 py-3 space-y-3 max-h-56 overflow-y-auto">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="text-sm px-3 py-2 max-w-[80%]"
                style={{
                  background: m.role === 'user' ? 'var(--secondary)' : 'var(--bg)',
                  color: m.role === 'user' ? 'white' : 'var(--text)',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="text-sm px-3 py-2" style={{ background: 'var(--bg)', borderRadius: '18px 18px 18px 4px', color: 'var(--muted)' }}>
                <span className="animate-pulse">{t(lang, 'chat_thinking')}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="px-4 py-3 flex gap-2 flex-wrap">
        {msgs.length === 0 && (
          <div className="flex gap-2 flex-wrap mb-2 w-full">
            {[t(lang, 'chat_suggestion_1'), t(lang, 'chat_suggestion_2'), t(lang, 'chat_suggestion_3')].map(s => (
              <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1 border transition-colors hover:border-[var(--secondary)]"
                style={{ borderRadius: '999px', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder={t(lang, 'chat_placeholder')}
          className="flex-1 text-sm px-3 py-2 outline-none"
          style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--secondary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        <button onClick={ask} disabled={loading || !input.trim()}
          className="px-3 py-2 text-white text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-sm)' }}>
          {t(lang, 'chat_ask')}
        </button>
      </div>
    </div>
  );
}

// ── Cook Mode ────────────────────────────────────────────────────────────────

function CookMode({ recipe, lang, steps, onClose }: {
  recipe: Recipe;
  lang: Locale;
  steps: { order: number; text: string }[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1510' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-white/60 text-sm">{recipeTitle(recipe, lang)}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white text-sm px-3 py-1.5 border border-white/20 rounded-full">
          {t(lang, 'recipe_exit_cook')}
        </button>
      </div>
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} className="flex-1 h-1 rounded-full cursor-pointer transition-all"
              style={{ background: i === idx ? 'var(--accent)' : i < idx ? 'var(--secondary)' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <p className="text-white/40 text-xs mt-2">
          {t(lang, 'recipe_step_of', { i: idx + 1, n: steps.length })}
        </p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl font-bold text-white"
          style={{ background: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
          {step?.order}
        </div>
        <p className="text-white text-2xl md:text-3xl leading-relaxed max-w-2xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
          {step?.text}
        </p>
        {step && extractMinutes(step.text) && (
          <div className="mt-6">
            <StepTimer minutes={extractMinutes(step.text)!} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-6 py-6">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="px-6 py-3 text-white border border-white/20 rounded-full disabled:opacity-20 text-sm">
          {t(lang, 'recipe_prev')}
        </button>
        <span className="text-white/30 text-sm">{t(lang, 'recipe_swipe')}</span>
        {idx < steps.length - 1 ? (
          <button onClick={() => setIdx(i => i + 1)}
            className="px-6 py-3 text-white rounded-full text-sm font-medium"
            style={{ background: 'var(--secondary)' }}>
            {t(lang, 'recipe_next')}
          </button>
        ) : (
          <button onClick={onClose}
            className="px-6 py-3 text-white rounded-full text-sm font-medium"
            style={{ background: 'var(--accent)' }}>
            {t(lang, 'recipe_done')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Translation banner ───────────────────────────────────────────────────────

function TranslateBanner({ recipeId, lang, onTranslated }: {
  recipeId: string;
  lang: Locale;
  onTranslated: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function translate() {
    setStatus('loading');
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      if (!res.ok) throw new Error();
      setStatus('done');
      setTimeout(onTranslated, 800);
    } catch {
      setStatus('error');
    }
  }

  if (lang !== 'es') return null;

  return (
    <div className="mb-4 px-4 py-3 flex items-center justify-between gap-4 rounded-xl border"
      style={{ background: 'rgba(31,138,112,0.06)', borderColor: 'rgba(31,138,112,0.2)' }}>
      <p className="text-sm" style={{ color: 'var(--text)' }}>
        {status === 'done' ? t(lang, 'translate_done') : status === 'error' ? t(lang, 'translate_error') : t(lang, 'translate_banner')}
      </p>
      {status === 'idle' && (
        <button onClick={translate}
          className="flex-shrink-0 px-4 py-1.5 text-sm font-medium text-white rounded-lg"
          style={{ background: 'var(--secondary)' }}>
          {t(lang, 'translate_btn')}
        </button>
      )}
      {status === 'loading' && (
        <span className="text-sm animate-pulse" style={{ color: 'var(--secondary)' }}>
          {t(lang, 'translate_loading')}
        </span>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RecipeDetailClient({ recipe: initialRecipe, lang }: { recipe: Recipe; lang: string }) {
  const locale = lang as Locale;
  const id = initialRecipe.id;
  const router = useRouter();

  const { isAdmin } = useAdmin();
  // Seeded from the server-fetched recipe (props) — no client fetch on mount, so
  // the content is in the initial HTML. We keep local state so the translate
  // banner can refresh the recipe in place.
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [servings, setServings] = useState<number>(initialRecipe.servings || 1);
  const [origServings, setOrigServings] = useState<number>(initialRecipe.servings || 1);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const loadRecipe = useCallback(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.recipe) return;
        setRecipe(d.recipe);
        const s = d.recipe.servings || 1;
        setServings(s);
        setOrigServings(s);
      });
  }, [id]);

  const toggleCheck = useCallback((i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE', cache: 'no-store', headers: { ...getAdminHeaders() } });
      if (!res.ok) {
        setDeleting(false);
        setDeleteError(t(locale, 'recipe_delete_failed'));
        return;
      }
      // Navigate home and invalidate the router cache so the deleted recipe
      // doesn't linger in the (cached) list — the classic post-mutation refresh.
      router.push(`/${lang}`);
      router.refresh();
    } catch {
      setDeleting(false);
      setDeleteError(t(locale, 'recipe_delete_failed_conn'));
    }
  }

  const allImages = [
    ...(recipe.image_url ? [recipe.image_url] : []),
    ...(recipe.gallery_images?.filter(u => u !== recipe.image_url) || []),
  ];
  const multiplier = origServings > 0 ? servings / origServings : 1;

  // Use translated content when in Spanish
  const displayTitle = recipeTitle(recipe, locale);
  const displayDescription = recipeDescription(recipe, locale);
  const displayNotes = recipeNotes(recipe, locale);
  const displaySteps = recipeSteps(recipe, locale).sort((a, b) => a.order - b.order);
  const displayTags = recipeTags(recipe, locale);
  const needsTranslation = locale === 'es' && !hasSpanishTranslation(recipe);

  return (
    <>
      {cookMode && (
        <CookMode recipe={recipe} lang={locale} steps={displaySteps} onClose={() => setCookMode(false)} />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between mb-4">
          <Link href={`/${lang}`} className="inline-flex items-center gap-1 text-sm hover:opacity-70"
            style={{ color: 'var(--muted)' }}>
            {t(locale, 'recipe_back')}
          </Link>
          <div className="flex gap-2">
            {displaySteps.length > 0 && (
              <button onClick={() => setCookMode(true)}
                className="px-4 py-1.5 text-sm font-medium text-white"
                style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-sm)' }}>
                {t(locale, 'recipe_cook_mode')}
              </button>
            )}
            {isAdmin && (
              <>
                <Link href={`/${lang}/recipes/${id}/edit`}
                  className="px-3 py-1.5 text-sm font-medium border"
                  style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {t(locale, 'recipe_edit')}
                </Link>
                <button onClick={() => { setDeleteError(''); setShowConfirm(true); }}
                  className="px-3 py-1.5 text-sm font-medium text-white"
                  style={{ borderRadius: 'var(--radius-sm)', background: '#e05252' }}>
                  {t(locale, 'recipe_delete')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Translation banner (Spanish only, if not translated) */}
        {needsTranslation && (
          <TranslateBanner recipeId={id} lang={locale} onTranslated={loadRecipe} />
        )}

        {/* Hero image / gallery */}
        {allImages.length > 0 && (
          <div className="mb-6">
            <div className="relative overflow-hidden" style={{ height: '55vh', minHeight: 280, borderRadius: 'var(--radius-md)' }}>
              <Image src={allImages[activeImg]} alt={displayTitle} fill className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(47,43,40,0.6) 0%, transparent 50%)' }} />
              {allImages.length > 1 && (
                <>
                  <button aria-label={locale === 'es' ? 'Imagen anterior' : 'Previous image'} onClick={() => setActiveImg(i => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>‹</button>
                  <button aria-label={locale === 'es' ? 'Imagen siguiente' : 'Next image'} onClick={() => setActiveImg(i => (i + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>›</button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, i) => (
                      <button key={i} onClick={() => setActiveImg(i)} className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === activeImg ? 'white' : 'rgba(255,255,255,0.4)' }} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className="relative flex-shrink-0 overflow-hidden transition-all"
                    style={{ width: 72, height: 52, borderRadius: 'var(--radius-sm)', border: `2px solid ${i === activeImg ? 'var(--secondary)' : 'transparent'}` }}>
                    <Image src={img} alt="" fill className="object-cover" sizes="72px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title + meta */}
        <div className="mb-2">
          <h1 className="text-4xl leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
            {displayTitle}
          </h1>
          {displayDescription && (
            <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>{displayDescription}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm" style={{ color: 'var(--muted)' }}>
          {recipe.cuisine && <span>🌍 {localizeCuisine(recipe.cuisine, locale)}</span>}
          {recipe.total_time && <span>⏱ {formatTime(recipe.total_time, locale)}</span>}
          {recipe.servings && <span>👤 {t(locale, 'recipe_servings', { n: recipe.servings })}</span>}
        </div>

        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {displayTags.map(tag => (
              <span key={tag} className="px-3 py-1 text-xs"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '999px', color: 'var(--muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid md:grid-cols-5 gap-8">

          {/* Ingredients panel */}
          <div className="md:col-span-2">
            <div className="sticky top-20 border p-5"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
                  {t(locale, 'recipe_ingredients')}
                </h2>
                {origServings > 0 && (
                  <div className="flex items-center gap-1 border px-2 py-1 text-xs"
                    style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                    <button onClick={() => setServings(s => Math.max(1, s - 1))} className="w-5 text-center font-bold"
                      style={{ color: 'var(--accent)' }}>−</button>
                    <span className="w-14 text-center font-medium" style={{ color: 'var(--text)' }}>
                      {servings} {t(locale, 'recipe_srv')}
                    </span>
                    <button onClick={() => setServings(s => s + 1)} className="w-5 text-center font-bold"
                      style={{ color: 'var(--accent)' }}>+</button>
                  </div>
                )}
              </div>
              {recipe.ingredients?.length > 0 ? (
                <ul className="space-y-1">
                  {recipe.ingredients.map((ing, i) => {
                    const translated = recipeIngredientItem(recipe, i, locale);
                    return (
                      <li key={i} onClick={() => toggleCheck(i)}
                        className="flex gap-3 text-sm py-1.5 border-b last:border-b-0 cursor-pointer"
                        style={{ borderColor: 'var(--border)', opacity: checked.has(i) ? 0.4 : 1 }}>
                        <span className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border flex items-center justify-center transition-colors"
                          style={{ borderColor: checked.has(i) ? 'var(--secondary)' : 'var(--border)', background: checked.has(i) ? 'var(--secondary)' : 'transparent' }}>
                          {checked.has(i) && <span className="text-white text-xs">✓</span>}
                        </span>
                        <span className="w-14 flex-shrink-0 text-right font-medium" style={{ color: 'var(--accent)' }}>
                          {scaleAmount(ing.amount, multiplier)} {localizeUnit(ing.unit, locale)}
                        </span>
                        <span style={{ color: 'var(--text)', textDecoration: checked.has(i) ? 'line-through' : 'none' }}>
                          {translated.item}
                          {translated.notes && <span style={{ color: 'var(--muted)' }}> ({translated.notes})</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{t(locale, 'recipe_no_ingredients')}</p>
              )}
              {checked.size > 0 && (
                <button onClick={() => setChecked(new Set())}
                  className="mt-4 w-full py-2 text-xs border"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)', borderRadius: 'var(--radius-sm)' }}>
                  {t(locale, 'recipe_clear_checked', { n: checked.size })}
                </button>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="md:col-span-3">
            <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
              {t(locale, 'recipe_instructions')}
            </h2>
            {displaySteps.length > 0 ? (
              <ol className="space-y-6">
                {displaySteps.map(step => {
                  const mins = extractMinutes(step.text);
                  return (
                    <li key={step.order} className="flex gap-4">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--secondary)' }}>
                        {step.order}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{step.text}</p>
                        {mins && <StepTimer minutes={mins} />}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{t(locale, 'recipe_no_steps')}</p>
            )}

            {displayNotes && (
              <div className="mt-8 p-4 border-l-4"
                style={{ background: '#fdf3ec', borderLeftColor: 'var(--accent)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                  {t(locale, 'recipe_notes')}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{displayNotes}</p>
              </div>
            )}

            <RecipeChat recipe={recipe} lang={locale} />
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="p-6 max-w-sm w-full"
            style={{ background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}>
            <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
              {t(locale, 'recipe_delete_title')}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              {t(locale, 'recipe_delete_body', { title: displayTitle })}
            </p>
            {deleteError && (
              <p className="text-sm mb-4" style={{ color: '#e05252' }}>{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white"
                style={{ background: '#e05252', borderRadius: 'var(--radius-sm)' }}>
                {deleting ? t(locale, 'recipe_deleting') : t(locale, 'recipe_delete')}
              </button>
              <button onClick={() => { setShowConfirm(false); setDeleteError(''); }} disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium border disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)' }}>
                {t(locale, 'recipe_delete_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
