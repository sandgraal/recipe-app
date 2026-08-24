'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/lib/useFavorites';
import { t, type Locale } from '@/lib/i18n';

/**
 * Favorite (♥) toggle. `card` presentation is an overlay chip for the corner of
 * a recipe card; `button` presentation matches the detail-page action bar.
 * Stops click propagation so favoriting from a card never triggers navigation.
 */
export default function FavoriteButton({
  recipeId, lang, presentation = 'card', label = false, size = 18,
}: {
  recipeId: string;
  lang: string;
  presentation?: 'card' | 'button';
  label?: boolean;
  size?: number;
}) {
  const locale = lang as Locale;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(recipeId);
  const aria = fav ? t(locale, 'unfavorite') : t(locale, 'favorite');

  const heart = (
    <Heart
      size={size}
      aria-hidden="true"
      fill={fav ? 'var(--accent)' : 'none'}
      color={fav ? 'var(--accent)' : 'currentColor'}
      strokeWidth={2}
    />
  );

  function onClick(e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(recipeId);
  }

  if (presentation === 'button') {
    return (
      <button
        type="button" onClick={onClick} aria-pressed={fav} aria-label={aria} title={aria}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border"
        style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: fav ? 'var(--accent)' : 'var(--text)' }}
      >
        {heart}
        {label && <span className="hidden sm:inline">{fav ? t(locale, 'favorited') : t(locale, 'favorite_short')}</span>}
      </button>
    );
  }

  return (
    <button
      type="button" onClick={onClick} aria-pressed={fav} aria-label={aria} title={aria}
      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', color: '#fff' }}
    >
      {heart}
    </button>
  );
}
