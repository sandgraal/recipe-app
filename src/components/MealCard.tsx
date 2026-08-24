import Link from 'next/link';
import Image from 'next/image';
import { UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import type { MealSummary } from '@/lib/types';

/** A meal as a collage card — a 2×2-ish grid of its recipes' photos + the meal
 *  title, recipe count, and a shopping-list cue. Links to the meal page. */
export default function MealCard({ meal, lang }: { meal: MealSummary; lang: string }) {
  const locale = lang as Locale;
  const es = locale === 'es';
  const title = es ? meal.title_es || meal.title : meal.title;
  const imgs = meal.recipes.filter(r => r.image_url).slice(0, 4);
  const count = meal.recipes.length;

  // Layout: 4 → 2×2; 3 → two on top + one full-width below; 2 → side by side;
  // 1 → full bleed.
  const cellStyle = (i: number): React.CSSProperties => {
    if (imgs.length === 1) return { gridColumn: '1 / -1', gridRow: '1 / -1' };
    if (imgs.length === 2) return { gridRow: '1 / -1' };
    if (imgs.length === 3 && i === 2) return { gridColumn: '1 / -1' };
    return {};
  };

  return (
    <Link href={`/${lang}/meals/${meal.slug}`}
      className="card-surface hover-lift group flex flex-col overflow-hidden">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '16 / 10', background: 'var(--bg)' }}>
        {imgs.length > 0 ? imgs.map((r, i) => (
          <div key={r.id} className="relative overflow-hidden" style={cellStyle(i)}>
            <Image src={r.image_url!} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 280px" />
          </div>
        )) : (
          <div className="flex items-center justify-center" style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}>
            <UtensilsCrossed size={28} aria-hidden="true" style={{ color: 'var(--muted)' }} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg leading-snug" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>{title}</h3>
        <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          <span className="inline-flex items-center gap-1"><UtensilsCrossed size={13} aria-hidden="true" /> {t(locale, 'meal_n_recipes', { n: count })}</span>
          <span className="inline-flex items-center gap-1"><ShoppingCart size={13} aria-hidden="true" /> {t(locale, 'meal_shopping_list')}</span>
        </div>
      </div>
    </Link>
  );
}
