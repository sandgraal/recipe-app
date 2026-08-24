-- Ranked, typo-tolerant, accent-insensitive bilingual recipe search.
--
-- Replaces the old `search_recipes` (ILIKE '%q%', no ranking, no typo/accent
-- handling) with Postgres full-text search across English + Spanish configs
-- (so plurals/stems match in both languages), ordered by ts_rank — plus a
-- pg_trgm similarity() fallback for typos and unaccent() so "platano" finds
-- "plátano". Still returns `setof recipes`, so the API route / browse chaining
-- is unchanged. At a few hundred recipes this runs per-query without a stored
-- tsvector column; if the catalog grows into the thousands, add a generated
-- tsvector column + GIN index and point the query at it.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Flatten a recipe's searchable text (both languages, incl. ingredient items/notes).
create or replace function public.recipe_fts_text(rec public.recipes)
returns text
language sql
stable
as $$
  select concat_ws(' ',
    rec.title, rec.title_es, rec.description, rec.description_es,
    rec.cuisine, rec.region,
    array_to_string(coalesce(rec.tags, '{}'), ' '),
    array_to_string(coalesce(rec.tags_es, '{}'), ' '),
    (select string_agg(concat_ws(' ', e->>'item', e->>'notes'), ' ')
       from jsonb_array_elements(
         case when jsonb_typeof(rec.ingredients) = 'array' then rec.ingredients else '[]'::jsonb end
       ) e),
    (select string_agg(concat_ws(' ', e->>'item', e->>'notes'), ' ')
       from jsonb_array_elements(
         case when jsonb_typeof(rec.ingredients_es) = 'array' then rec.ingredients_es else '[]'::jsonb end
       ) e)
  );
$$;

create or replace function public.search_recipes(q text)
returns setof public.recipes
language sql
stable
as $$
  with pp as (
    select
      nullif(btrim(q), '') as raw,
      extensions.unaccent(lower(coalesce(btrim(q), ''))) as uq
  )
  select r.*
  from public.recipes r, pp
  where pp.raw is null
     or (
          to_tsvector('english', extensions.unaccent(lower(public.recipe_fts_text(r))))
          || to_tsvector('spanish', extensions.unaccent(lower(public.recipe_fts_text(r))))
        ) @@ (
          websearch_to_tsquery('english', pp.uq)
          || websearch_to_tsquery('spanish', pp.uq)
        )
     or extensions.unaccent(lower(public.recipe_fts_text(r))) like '%' || pp.uq || '%'
     or extensions.similarity(
          extensions.unaccent(lower(concat_ws(' ', r.title, r.title_es))), pp.uq
        ) > 0.3
  order by
    ts_rank(
      to_tsvector('english', extensions.unaccent(lower(public.recipe_fts_text(r))))
      || to_tsvector('spanish', extensions.unaccent(lower(public.recipe_fts_text(r)))),
      websearch_to_tsquery('english', pp.uq) || websearch_to_tsquery('spanish', pp.uq)
    ) desc,
    extensions.similarity(extensions.unaccent(lower(coalesce(r.title, ''))), pp.uq) desc,
    r.created_at desc;
$$;

grant execute on function public.recipe_fts_text(public.recipes) to anon, authenticated, service_role;
grant execute on function public.search_recipes(text) to anon, authenticated, service_role;
