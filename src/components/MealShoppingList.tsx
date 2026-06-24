'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';
import type { ShoppingAisle, ShoppingItem } from '@/lib/types';
import { ShoppingCart, Check, Copy, Printer } from 'lucide-react';

interface Props {
  aisles: ShoppingAisle[];
  lang: string;
  slug: string;
  title: string;
}

export default function MealShoppingList({ aisles, lang, slug, title }: Props) {
  const locale = lang as Locale;
  const es = locale === 'es';
  const storageKey = `meal-shop:${slug}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Restore ticked items from a previous shopping trip (no account needed).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  function toggle(key: string) {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const aisleName = (a: ShoppingAisle) => (es ? a.aisle_es || a.aisle : a.aisle);
  const itemName = (it: ShoppingItem) => (es ? it.name_es || it.name : it.name);
  const itemQty = (it: ShoppingItem) => (es ? it.qty_es || it.qty : it.qty) || '';

  async function copyAll() {
    const lines: string[] = [title, ''];
    for (const a of aisles) {
      lines.push(aisleName(a).toUpperCase());
      for (const it of a.items) lines.push(`- ${itemName(it)}${itemQty(it) ? ` — ${itemQty(it)}` : ''}`);
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard may be blocked */ }
  }

  const total = aisles.reduce((n, a) => n + a.items.length, 0);
  const done = aisles.reduce((n, a) => n + a.items.filter(it => checked[it.name]).length, 0);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          <ShoppingCart size={16} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>{t(locale, 'meal_shopping_list')}</span>
          <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>{done}/{total}</span>
        </div>
        <div className="flex items-center gap-2" data-no-print>
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border transition-colors"
            style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? t(locale, 'meal_copied') : t(locale, 'meal_copy')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label={es ? 'Imprimir' : 'Print'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border transition-colors"
            style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}
          >
            <Printer size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{es ? 'Imprimir' : 'Print'}</span>
          </button>
        </div>
      </div>

      <div className="border p-5 sm:p-6 space-y-5"
        style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-md)' }}>
        {aisles.map((a, ai) => (
          <div key={ai}>
            <h3 className="text-xs font-semibold uppercase mb-2" style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
              {aisleName(a)}
            </h3>
            <ul className="space-y-1.5">
              {a.items.map((it, ii) => {
                const key = it.name; // stable key across locales
                const isChecked = !!checked[key];
                return (
                  <li key={ii}>
                    {/* role=checkbox (not <input>/<button>) so it survives the print stylesheet */}
                    <div
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onClick={() => toggle(key)}
                      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(key); } }}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <span className="flex-shrink-0 flex items-center justify-center"
                        style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${isChecked ? 'var(--secondary)' : 'var(--border)'}`, background: isChecked ? 'var(--secondary)' : 'transparent' }}>
                        {isChecked && <Check size={12} color="#fff" aria-hidden="true" />}
                      </span>
                      <span className="text-sm" style={{ color: isChecked ? 'var(--muted)' : 'var(--text)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                        <span style={{ fontWeight: 500 }}>{itemName(it)}</span>{itemQty(it) ? <span style={{ color: 'var(--muted)' }}> — {itemQty(it)}</span> : null}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
