-- Pin search_path on three functions flagged by the Supabase advisor
-- (function_search_path_mutable). ALTER ... SET leaves the bodies untouched.
--
-- * search_recipes calls extensions.unaccent() / extensions.similarity() with
--   schema-qualified names, but unaccent() looks its dictionary up through the
--   active search_path, so `extensions` must stay on the path (an empty path
--   would break accent-insensitive search). public is needed for the
--   `recipes` row type and recipe_fts_text().
-- * recipe_fts_text only uses pg_catalog built-ins and the public.recipes type.
-- * update_updated_at is a trigger that only calls now().
--
-- Idempotent: re-running just re-sets the same values.

alter function public.search_recipes(text)
  set search_path = public, extensions, pg_catalog;

alter function public.recipe_fts_text(public.recipes)
  set search_path = public, pg_catalog;

alter function public.update_updated_at()
  set search_path = public, pg_catalog;
