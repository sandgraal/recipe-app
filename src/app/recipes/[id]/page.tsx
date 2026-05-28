'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/lib/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract minutes from freeform step text ("simmer for 10 minutes", "bake 45 min") */
function extractMinutes(text: string): number | null {
  const m = text.match(/(\d+)\s*(?:to\s*\d+\s*)?(?:min(?:ute)?s?|hrs?|hours?)/i);
  if (!m) return null;
  const n = parseInt(m[1]);
  return /hours?|hrs?/i.test(m[0]) ? n * 60 : n;
}

/** Scale a fractional amount string by a multiplier */
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
  const rounded = Math.round(scaled * 8) / 8; // snap to 1/8
  // Format nicely
  if (rounded === Math.floor(rounded)) return String(rounded);
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracStr = frac < 0.2 ? '⅛' : frac < 0.4 ? '¼' : frac < 0.6 ? '½' : frac < 0.9 ? '¾' : '';
  return whole > 0 ? `${whole}${fracStr}` : fracStr || String(rounded.toFixed(1));
}

// ── Timer component ──────────────────────────────────────────────────────────

function StepTimer({ minutes }: { minutes: number }) {
  const [secs, setSecs] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && secs > 0) {
      interval.current = setInterval(() => setSecs(s => s - 1), 1000);
    } else {
      if (interval.current) clearInterval(interval.current);
      if (secs === 0 && running) {
        setRunning(false);
        if (typeof window !== 'undefined') {
          new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2ozLS1osd3hqW02LTOB3efjqWs6LjOI5u/qq3A7LDyS6/LsrXU9KkKe7/jtrnk/JUmo8/nurX0+IlCy9/fvsX4/HlW7+/jwsoBBG1q//Pnyso...').play().catch(() => {});
        }
      }
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

function RecipeChat({ recipe }: { recipe: Recipe }) {
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
        body: JSON.stringify({ question: q, recipe }),
      });
      const { answer } = await res.json();
      setMsgs(m => [...m, { role: 'ai', text: answer }]);
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: "Sorry, couldn't reach the AI right now." }]);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  return (
    <div className="mt-8 border" style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <span style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>🤖</span>
        <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Ask about this recipe
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>substitutions · tips · scaling</span>
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
                <span className="animate-pulse">thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="px-4 py-3 flex gap-2">
        {msgs.length === 0 && (
          <div className="flex gap-2 flex-wrap mb-2 w-full">
            {["Can I substitute anything?", "How do I not overcook this?", "Make it spicier"].map(s => (
              <button key={s} onClick={() => { setInput(s); }} className="text-xs px-3 py-1 border transition-colors hover:border-[var(--secondary)]"
                style={{ borderRadius: '999px', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="Ask anything about this recipe…"
          className="flex-1 text-sm px-3 py-2 outline-none"
          style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--secondary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        <button onClick={ask} disabled={loading || !input.trim()}
          className="px-3 py-2 text-white text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-sm)' }}>
          Ask
        </button>
      </div>
    </div>
  );
}

// ── Cook Mode ────────────────────────────────────────────────────────────────

function CookMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const steps = (recipe.steps || []).sort((a, b) => a.order - b.order);
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1510' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-white/60 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          {recipe.title}
        </span>
        <button onClick={onClose} className="text-white/60 hover:text-white text-sm px-3 py-1.5 border border-white/20 rounded-full">
          Exit Cook Mode ✕
        </button>
      </div>

      {/* Step counter */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} className="flex-1 h-1 rounded-full cursor-pointer transition-all"
              style={{ background: i === idx ? 'var(--accent)' : i < idx ? 'var(--secondary)' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <p className="text-white/40 text-xs mt-2">Step {idx + 1} of {steps.length}</p>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl font-bold text-white"
          style={{ background: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
          {step?.order}
        </div>
        <p className="text-white text-2xl md:text-3xl leading-relaxed max-w-2xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
          {step?.text}
        </p>
        {step && extractMinutes(step.text) && (
          <div className="mt-6">
            <StepTimer minutes={extractMinutes(step.text)!} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-6">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="px-6 py-3 text-white border border-white/20 rounded-full disabled:opacity-20 text-sm">
          ← Prev
        </button>
        <span className="text-white/30 text-sm">swipe or tap</span>
        {idx < steps.length - 1 ? (
          <button onClick={() => setIdx(i => i + 1)}
            className="px-6 py-3 text-white rounded-full text-sm font-medium"
            style={{ background: 'var(--secondary)' }}>
            Next →
          </button>
        ) : (
          <button onClick={onClose}
            className="px-6 py-3 text-white rounded-full text-sm font-medium"
            style={{ background: 'var(--accent)' }}>
            🎉 Done!
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [servings, setServings] = useState<number>(1);
  const [origServings, setOrigServings] = useState<number>(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.json())
      .then(d => {
        setRecipe(d.recipe);
        const s = d.recipe?.servings || 1;
        setServings(s);
        setOrigServings(s);
        setLoading(false);
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
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    router.push('/');
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 w-1/2" style={{ background: 'var(--border)', borderRadius: 'var(--radius-sm)' }} />
        <div className="h-72" style={{ background: 'var(--border)', borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <h1 className="text-xl font-semibold">Recipe not found</h1>
        <Link href="/" className="mt-4 inline-block text-sm" style={{ color: 'var(--accent)' }}>← Back</Link>
      </div>
    );
  }

  const allImages = [
    ...(recipe.image_url ? [recipe.image_url] : []),
    ...(recipe.gallery_images?.filter(u => u !== recipe.image_url) || []),
  ];
  const multiplier = origServings > 0 ? servings / origServings : 1;
  const steps = (recipe.steps || []).sort((a, b) => a.order - b.order);

  return (
    <>
      {cookMode && <CookMode recipe={recipe} onClose={() => setCookMode(false)} />}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm hover:opacity-70" style={{ color: 'var(--muted)' }}>
            ← Back
          </Link>
          <div className="flex gap-2">
            {steps.length > 0 && (
              <button onClick={() => setCookMode(true)}
                className="px-4 py-1.5 text-sm font-medium text-white"
                style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-sm)' }}>
                👨‍🍳 Cook Mode
              </button>
            )}
            <Link href={`/recipes/${id}/edit`}
              className="px-3 py-1.5 text-sm font-medium border"
              style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              Edit
            </Link>
            <button onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 text-sm font-medium text-white"
              style={{ borderRadius: 'var(--radius-sm)', background: '#e05252' }}>
              Delete
            </button>
          </div>
        </div>

        {/* Hero image / gallery */}
        {allImages.length > 0 && (
          <div className="mb-6">
            <div className="relative overflow-hidden" style={{ height: '55vh', minHeight: 280, borderRadius: 'var(--radius-md)' }}>
              <Image src={allImages[activeImg]} alt={recipe.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 1024px" />
              {/* Gradient overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(47,43,40,0.6) 0%, transparent 50%)' }} />
              {/* Gallery nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImg(i => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>‹</button>
                  <button onClick={() => setActiveImg(i => (i + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>›</button>
                  {/* Dot indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === activeImg ? 'white' : 'rgba(255,255,255,0.4)' }} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Thumbnail strip */}
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
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl leading-tight flex-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
              {recipe.title}
            </h1>
          </div>
          {recipe.description && (
            <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>{recipe.description}</p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm" style={{ color: 'var(--muted)' }}>
          {recipe.cuisine && <span>🌍 {recipe.cuisine}</span>}
          {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
          {recipe.servings && <span>👤 {recipe.servings} servings</span>}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)', marginLeft: 'auto' }}>
              ↗ Original recipe
            </a>
          )}
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tags.map(tag => (
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
                  Ingredients
                </h2>
                {/* Servings scaler */}
                {origServings > 0 && (
                  <div className="flex items-center gap-1 border px-2 py-1 text-xs"
                    style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                    <button onClick={() => setServings(s => Math.max(1, s - 1))} className="w-5 text-center font-bold"
                      style={{ color: 'var(--accent)' }}>−</button>
                    <span className="w-10 text-center font-medium" style={{ color: 'var(--text)' }}>{servings} srv</span>
                    <button onClick={() => setServings(s => s + 1)} className="w-5 text-center font-bold"
                      style={{ color: 'var(--accent)' }}>+</button>
                  </div>
                )}
              </div>
              {recipe.ingredients?.length > 0 ? (
                <ul className="space-y-1">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} onClick={() => toggleCheck(i)}
                      className="flex gap-3 text-sm py-1.5 border-b last:border-b-0 cursor-pointer group"
                      style={{ borderColor: 'var(--border)', opacity: checked.has(i) ? 0.4 : 1 }}>
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border flex items-center justify-center transition-colors"
                        style={{ borderColor: checked.has(i) ? 'var(--secondary)' : 'var(--border)', background: checked.has(i) ? 'var(--secondary)' : 'transparent' }}>
                        {checked.has(i) && <span className="text-white text-xs">✓</span>}
                      </span>
                      <span className="w-14 flex-shrink-0 text-right font-medium" style={{ color: 'var(--accent)' }}>
                        {scaleAmount(ing.amount, multiplier)} {ing.unit}
                      </span>
                      <span style={{ color: 'var(--text)', textDecoration: checked.has(i) ? 'line-through' : 'none' }}>
                        {ing.item}
                        {ing.notes && <span style={{ color: 'var(--muted)' }}> ({ing.notes})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No ingredients listed.</p>
              )}

              {/* Shopping list hint */}
              {checked.size > 0 && (
                <button onClick={() => setChecked(new Set())}
                  className="mt-4 w-full py-2 text-xs border"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)', borderRadius: 'var(--radius-sm)' }}>
                  Clear {checked.size} checked
                </button>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="md:col-span-3">
            <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
              Instructions
            </h2>
            {steps.length > 0 ? (
              <ol className="space-y-6">
                {steps.map((step) => {
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
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No steps listed.</p>
            )}

            {/* Notes */}
            {recipe.notes && (
              <div className="mt-8 p-4 border-l-4"
                style={{ background: '#fdf3ec', borderLeftColor: 'var(--accent)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>Notes</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{recipe.notes}</p>
              </div>
            )}

            {/* AI Chat */}
            <RecipeChat recipe={recipe} />
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="p-6 max-w-sm w-full"
            style={{ background: 'var(--card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}>
            <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
              Delete Recipe?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              "{recipe.title}" will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white"
                style={{ background: '#e05252', borderRadius: 'var(--radius-sm)' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium border"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-sm)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
