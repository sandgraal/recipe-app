import { Recipe } from '@/lib/types';
import RecipeCard from './RecipeCard';
import { RECIPE_CATEGORIES } from '@/lib/taxonomy';
import { localizeRecipeCategory, t, type Locale } from '@/lib/i18n';

function Grid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {recipes.map(r => (
        <RecipeCard key={r.id} recipe={r} size="standard" />
      ))}
    </div>
  );
}

/**
 * Responsive card grid. With `groupByCategory`, results are split into
 * category sections (in canonical order, uncategorized last) with sub-headers —
 * the fix for the old flat "everything crammed together" wall.
 */
export default function RecipeGrid({
  recipes,
  groupByCategory = false,
  lang = 'en',
}: {
  recipes: Recipe[];
  groupByCategory?: boolean;
  lang?: string;
}) {
  if (!groupByCategory) return <Grid recipes={recipes} />;

  const locale = lang as Locale;
  const groups: { key: string; label: string; items: Recipe[] }[] = [];
  for (const cat of RECIPE_CATEGORIES) {
    const items = recipes.filter(r => r.category === cat);
    if (items.length) groups.push({ key: cat, label: localizeRecipeCategory(cat, locale), items });
  }
  const other = recipes.filter(r => !r.category);
  if (other.length) groups.push({ key: '_other', label: t(locale, 'browse_other'), items: other });

  if (groups.length <= 1) return <Grid recipes={recipes} />;

  return (
    <div className="space-y-10">
      {groups.map(g => (
        <section key={g.key}>
          <h2
            className="text-lg mb-4"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)' }}
          >
            {g.label}{' '}
            <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>
              ({g.items.length})
            </span>
          </h2>
          <Grid recipes={g.items} />
        </section>
      ))}
    </div>
  );
}
