-- Refine search_recipes() (supersedes the body in 20260824200000_search_fts.sql):
--  1. Compute the document text, its combined tsvector, and the tsquery ONCE per
--     row/query via LATERAL joins instead of recomputing them in both the WHERE
--     and ORDER BY (cheaper as the table grows).
--  2. Use the same concatenated title (`title` + `title_es`) for the trigram
--     tie-breaker in ORDER BY as the WHERE predicate, so Spanish-only titles
--     rank consistently.
-- recipe_fts_text() is unchanged.

create or replace function public.search_recipes(q text)
returns setof public.recipes
language sql
stable
as $$
  with pp as (
    select
      nullif(btrim(q), '') as raw,
      extensions.unaccent(lower(coalesce(btrim(q), ''))) as uq,
      websearch_to_tsquery('english', extensions.unaccent(lower(coalesce(btrim(q), ''))))
        || websearch_to_tsquery('spanish', extensions.unaccent(lower(coalesce(btrim(q), '')))) as tsq
  )
  select r.*
  from public.recipes r
  cross join pp
  cross join lateral (
    select
      extensions.unaccent(lower(public.recipe_fts_text(r))) as doc,
      extensions.unaccent(lower(concat_ws(' ', r.title, r.title_es))) as title_doc
  ) d
  cross join lateral (
    select to_tsvector('english', d.doc) || to_tsvector('spanish', d.doc) as doc_vec
  ) v
  where pp.raw is null
     or v.doc_vec @@ pp.tsq
     or d.doc like '%' || pp.uq || '%'
     or extensions.similarity(d.title_doc, pp.uq) > 0.3
  order by
    ts_rank(v.doc_vec, pp.tsq) desc,
    extensions.similarity(d.title_doc, pp.uq) desc,
    r.created_at desc;
$$;

grant execute on function public.search_recipes(text) to anon, authenticated, service_role;
