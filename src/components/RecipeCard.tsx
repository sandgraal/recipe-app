'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Recipe } from '@/lib/types';
import { recipeTitle, recipeTags, formatTime, localizeCuisine, type Locale } from '@/lib/i18n';

const GRADIENTS = [
  'linear-gradient(145deg, #fde8d8 0%, #f7c4a8 100%)',
  'linear-gradient(145deg, #d4ede7 0%, #a8d5c9 100%)',
  'linear-gradient(145deg, #fef3d4 0%, #f7dfa0 100%)',
  'linear-gradient(145deg, #f0e8df 0%, #ddc9b8 100%)',
  'linear-gradient(145deg, #e0ede9 0%, #b8d4cc 100%)',
];

type CardSize = 'hero' | 'standard' | 'compact';

export default function RecipeCard({ recipe, size = 'standard' }: { recipe: Recipe; size?: CardSize }) {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang || 'en';
  const gradient = GRADIENTS[recipe.title.charCodeAt(0) % GRADIENTS.length];

  if (size === 'hero') return <HeroCard recipe={recipe} gradient={gradient} lang={lang} />;
  if (size === 'compact') return <CompactCard recipe={recipe} gradient={gradient} lang={lang} />;
  return <StandardCard recipe={recipe} gradient={gradient} lang={lang} />;
}

// ── Hero card (large feature, full bleed, overlay text) ─────────────────────

function HeroCard({ recipe, gradient, lang }: { recipe: Recipe; gradient: string; lang: string }) {
  const locale = lang as Locale;
  const title = recipeTitle(recipe, locale);
  const tags = recipeTags(recipe, locale);
  return (
    <Link href={`/${lang}/recipes/${recipe.id}`} className="block group h-full">
      <article className="relative h-full overflow-hidden"
        style={{ borderRadius: 'var(--radius-lg)' }}>
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 55vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl"
            style={{ background: gradient }} aria-hidden="true">
            🍽️
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(15,10,8,0.85) 0%, rgba(15,10,8,0.3) 50%, transparent 100%)' }} />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {tags.slice(0, 1).map(tag => (
            <span key={tag} className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {tag}
            </span>
          ))}
          <h2 className="text-white leading-tight mb-2"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)' }}>
            {title}
          </h2>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {recipe.cuisine && <span>{localizeCuisine(recipe.cuisine, locale)}</span>}
            {recipe.total_time && <><span style={{ opacity: 0.5 }}>·</span><span>⏱ {formatTime(recipe.total_time, locale)}</span></>}
            {recipe.servings && <><span style={{ opacity: 0.5 }}>·</span><span>👤 {recipe.servings}</span></>}
          </div>
        </div>
      </article>
    </Link>
  );
}

// ── Standard card (grid view) ────────────────────────────────────────────────

function StandardCard({ recipe, gradient, lang }: { recipe: Recipe; gradient: string; lang: string }) {
  const locale = lang as Locale;
  const title = recipeTitle(recipe, locale);
  const tags = recipeTags(recipe, locale);
  return (
    <Link href={`/${lang}/recipes/${recipe.id}`} className="block group">
      <article className="overflow-hidden transition-all duration-200 border hover:-translate-y-0.5"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow)',
        }}
        onMouseOver={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
        onMouseOut={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}>
        <div className="relative h-44 w-full overflow-hidden">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: gradient }} aria-hidden="true">🍴</div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-base leading-snug mb-1 line-clamp-2"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
            {title}
          </h3>
          <div className="flex items-center gap-2 text-xs mt-2" style={{ color: 'var(--muted)' }}>
            {recipe.cuisine && <span>{localizeCuisine(recipe.cuisine, locale)}</span>}
            {recipe.total_time && <><span style={{ opacity: 0.4 }}>·</span><span>⏱ {formatTime(recipe.total_time, locale)}</span></>}
            {recipe.servings && <><span style={{ opacity: 0.4 }}>·</span><span>👤 {recipe.servings}</span></>}
          </div>
          {tags.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {tags.slice(0, 2).map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs"
                  style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="px-2 py-0.5 text-xs"
                  style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

// ── Compact card (horizontal scroll rows) ────────────────────────────────────

function CompactCard({ recipe, gradient, lang }: { recipe: Recipe; gradient: string; lang: string }) {
  const locale = lang as Locale;
  const title = recipeTitle(recipe, locale);
  return (
    <Link href={`/${lang}/recipes/${recipe.id}`} className="block group flex-shrink-0 w-48">
      <article className="overflow-hidden border transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow)',
        }}
        onMouseOver={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
        onMouseOut={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}>
        <div className="relative h-32 w-full overflow-hidden">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="192px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: gradient }} aria-hidden="true">🍴</div>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm leading-snug line-clamp-2 mb-1"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}>
            {title}
          </h3>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {[localizeCuisine(recipe.cuisine, locale), recipe.total_time ? formatTime(recipe.total_time, locale) : null].filter(Boolean).join(' · ') || ' '}
          </p>
        </div>
      </article>
    </Link>
  );
}
