'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { t, localizeDietary, type Locale, type TranslationKey } from '@/lib/i18n';
import { getAdminHeaders, useAdmin } from '@/lib/useAdmin';
import {
  classifyMeals, classifyRecipes, countByIssue, RECIPE_ISSUES,
  type HealthMeal, type HealthRecipe, type MealHealthRow, type RecipeHealthRow, type RecipeIssue,
} from '@/lib/recipeHealth';

const RECIPE_COLUMNS = 'id,title,title_es,image_url,total_time,region,category,dietary,ingredients,ingredients_es,steps,steps_es';
const PAGE = 1000; // PostgREST returns at most 1000 rows per request

type Data = { recipes: HealthRecipe[]; meals: HealthMeal[] };

/** Read-only: public columns through the public (anon) client. */
async function loadHealthData(): Promise<Data> {
  const db = getSupabase();
  const recipes: HealthRecipe[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('recipes').select(RECIPE_COLUMNS).order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    recipes.push(...((data ?? []) as HealthRecipe[]));
    if (!data || data.length < PAGE) break;
  }
  const { data: meals, error } = await db.from('meal_groups').select('id,slug,title,title_es,recipe_ids');
  if (error) throw error;
  return { recipes, meals: (meals ?? []) as HealthMeal[] };
}

const ISSUE_KEY: Record<RecipeIssue, TranslationKey> = {
  no_cover: 'health_issue_no_cover',
  external_photo: 'health_issue_external_photo',
  no_time_es: 'health_issue_no_time_es',
  no_title_es: 'health_issue_no_title_es',
  no_steps_es: 'health_issue_no_steps_es',
  no_region: 'health_issue_no_region',
  no_category: 'health_issue_no_category',
  no_dietary: 'health_issue_no_dietary',
  dietary_conflict: 'health_issue_dietary_conflict',
  short_ingredients: 'health_issue_short_ingredients',
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs border"
      style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--bg)' }}>
      {children}
    </span>
  );
}

export default function RecipeHealthPage() {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const locale = lang as Locale;
  const { isAdmin, loaded } = useAdmin();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<RecipeIssue | null>(null);
  const [copy, setCopy] = useState<Record<string, 'busy' | 'done' | 'failed'>>({});

  /** Admin action: copy one recipe's hotlinked photo into our storage (the API re-checks admin rights). */
  async function copyPhoto(id: string) {
    setCopy(c => ({ ...c, [id]: 'busy' }));
    try {
      const res = await fetch(`/api/recipes/${id}/rehost-image`, { method: 'POST', cache: 'no-store', headers: { ...getAdminHeaders() } });
      const body = await res.json().catch(() => ({}));
      const url = body?.recipe?.image_url as string | undefined;
      if (!res.ok || !url) throw new Error(`HTTP ${res.status}`);
      setData(d => (d ? { ...d, recipes: d.recipes.map(r => (r.id === id ? { ...r, image_url: url } : r)) } : d));
      setCopy(c => ({ ...c, [id]: 'done' }));
    } catch (err) {
      console.error('copy photo failed', err);
      setCopy(c => ({ ...c, [id]: 'failed' }));
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    loadHealthData()
      .then(d => { if (live) setData(d); })
      .catch(err => { console.error('recipe health load failed', err); if (live) setFailed(true); });
    return () => { live = false; };
  }, [isAdmin]);

  const recipeRows = useMemo<RecipeHealthRow[]>(() => (data ? classifyRecipes(data.recipes) : []), [data]);
  const mealRows = useMemo<MealHealthRow[]>(
    () => (data ? classifyMeals(data.meals, data.recipes.map(r => r.id)) : []),
    [data],
  );
  const counts = useMemo(() => countByIssue(recipeRows), [recipeRows]);
  const shownRecipes = filter ? recipeRows.filter(r => r.issues.includes(filter)) : recipeRows;

  const heading = (
    <>
      <h1 className="text-3xl leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {t(locale, 'health_title')}
      </h1>
      <p className="mt-2 mb-6 text-base max-w-2xl" style={{ color: 'var(--muted)' }}>{t(locale, 'health_subtitle')}</p>
    </>
  );

  if (!loaded) return <div className="max-w-4xl mx-auto px-4 py-8">{heading}</div>;

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {heading}
        <p className="text-sm" role="status" style={{ color: 'var(--muted)' }}>{t(locale, 'health_admin_only')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {heading}

      {failed ? (
        <p className="text-sm" role="alert" style={{ color: '#e05252' }}>{t(locale, 'health_failed')}</p>
      ) : !data ? (
        <p className="text-sm" role="status" style={{ color: 'var(--muted)' }}>{t(locale, 'health_loading')}</p>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>
            {t(locale, 'health_summary', { n: data.recipes.length, bad: recipeRows.length })}
          </p>

          {/* Recipes */}
          <section aria-labelledby="health-recipes">
            <h2 id="health-recipes" className="text-xs font-semibold uppercase mb-3" style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
              {t(locale, 'health_recipes_heading', { n: recipeRows.length })}
            </h2>
            {recipeRows.length === 0 ? (
              <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>{t(locale, 'health_all_good')}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t(locale, 'health_recipes_heading', { n: recipeRows.length })}>
                  <button type="button" aria-pressed={filter === null} onClick={() => setFilter(null)}
                    className="px-3 py-1 text-xs font-medium border rounded-full"
                    style={{ borderColor: 'var(--border)', background: filter === null ? 'var(--secondary)' : 'var(--card)', color: filter === null ? '#fff' : 'var(--text)' }}>
                    {t(locale, 'health_filter_all')} ({recipeRows.length})
                  </button>
                  {RECIPE_ISSUES.filter(i => counts[i] > 0).map(i => (
                    <button key={i} type="button" aria-pressed={filter === i} onClick={() => setFilter(filter === i ? null : i)}
                      className="px-3 py-1 text-xs font-medium border rounded-full"
                      style={{ borderColor: 'var(--border)', background: filter === i ? 'var(--secondary)' : 'var(--card)', color: filter === i ? '#fff' : 'var(--text)' }}>
                      {t(locale, ISSUE_KEY[i])} ({counts[i]})
                    </button>
                  ))}
                </div>
                <ul className="space-y-2 mb-10">
                  {shownRecipes.map(r => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 border"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <span className="flex-1 min-w-[10rem] text-sm font-medium break-words" style={{ color: 'var(--text)' }}>{locale === 'es' ? r.title_es || r.title : r.title}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {r.issues.map(i => <Chip key={i}>{t(locale, ISSUE_KEY[i])}</Chip>)}
                      </span>
                      {r.issues.includes('external_photo') && (
                        <button type="button" onClick={() => copyPhoto(r.id)} disabled={copy[r.id] === 'busy'}
                          className="px-3 py-1 text-xs font-medium border rounded-full disabled:opacity-60"
                          style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                          {copy[r.id] === 'busy' ? t(locale, 'health_copying') : t(locale, 'health_copy_photo')}
                        </button>
                      )}
                      {r.conflicts.length > 0 && (
                        <ul className="basis-full text-xs space-y-0.5" style={{ color: 'var(--muted)' }}>
                          {r.conflicts.map(c => (
                            <li key={`${c.label}|${c.ingredient}`} className="break-words">
                              {t(locale, 'health_conflict_detail', { label: localizeDietary(c.label, locale), item: c.ingredient })}
                            </li>
                          ))}
                        </ul>
                      )}
                      {copy[r.id] === 'failed' && (
                        <span className="basis-full text-xs" role="alert" style={{ color: '#e05252' }}>{t(locale, 'health_copy_failed')}</span>
                      )}
                      <Link href={`/${lang}/recipes/${r.id}/edit`} className="text-sm underline" style={{ color: 'var(--accent)' }}
                        aria-label={`${t(locale, 'health_edit_recipe')}: ${locale === 'es' ? r.title_es || r.title : r.title}`}>
                        {t(locale, 'health_edit_recipe')}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Meals */}
          <section aria-labelledby="health-meals">
            <h2 id="health-meals" className="text-xs font-semibold uppercase mb-3" style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
              {t(locale, 'health_meals_heading', { n: mealRows.length })}
            </h2>
            {mealRows.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{t(locale, 'health_all_good')}</p>
            ) : (
              <ul className="space-y-2">
                {mealRows.map(m => {
                  const title = data.meals.find(x => x.id === m.id);
                  const shown = locale === 'es' ? title?.title_es || m.title : m.title;
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 border"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <span className="flex-1 min-w-[10rem] text-sm font-medium break-words" style={{ color: 'var(--text)' }}>{shown}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {m.issues.includes('few_recipes') && (
                          <Chip>{t(locale, 'health_issue_few_recipes', { n: m.recipeCount })}</Chip>
                        )}
                        {m.issues.includes('missing_recipes') && (
                          <Chip>
                            {t(locale, m.missingIds.length === 1 ? 'health_issue_missing_recipes_one' : 'health_issue_missing_recipes_other', { n: m.missingIds.length })}
                          </Chip>
                        )}
                      </span>
                      {m.slug ? (
                        <Link href={`/${lang}/meals/${m.slug}`} className="text-sm underline" style={{ color: 'var(--accent)' }}
                          aria-label={`${t(locale, 'health_open_meal')}: ${shown}`}>
                          {t(locale, 'health_open_meal')}
                        </Link>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{t(locale, 'health_meal_no_slug')}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
