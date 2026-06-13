-- Ingredient-aware recipe search.
--
-- The GET /api/recipes `q` filter previously matched only title/cuisine/
-- description via PostgREST `.or(ilike)`. PostgREST can't cleanly express a
-- substring match *inside* the JSONB `ingredients` array, so searching for an
-- ingredient (e.g. "plátano", "coconut milk") missed recipes that contain it.
--
-- This function adds that: it matches q against title/cuisine/description AND
-- the `item`/`notes` text of each ingredient, in BOTH languages (the *_es
-- columns), so search works whether the user types English or Spanish. It
-- extracts only the ingredient `item`/`notes` fields (via jsonb_array_elements)
-- rather than casting the whole JSON to text, so structural keys like
-- "amount"/"unit" never produce false matches.
--
-- Returns `setof recipes`, so PostgREST still lets the route chain
-- .ilike('cuisine', …)/.contains('tags', …)/.order(…) on the result. SECURITY
-- INVOKER (the default) means the caller's RLS applies — anon keeps read-only
-- access; this exposes no new write path.
--
-- q is passed as a bound parameter (never string-concatenated into SQL), so it
-- is injection-safe; %/_ in q act as ILIKE wildcards, which is harmless here.

create or replace function public.search_recipes(q text)
returns setof public.recipes
language sql
stable
as $$
  select r.*
  from public.recipes r
  where coalesce(q, '') = ''
     or r.title ilike '%' || q || '%'
     or r.cuisine ilike '%' || q || '%'
     or r.description ilike '%' || q || '%'
     or r.title_es ilike '%' || q || '%'
     or r.description_es ilike '%' || q || '%'
     or (
          jsonb_typeof(r.ingredients) = 'array'
          and exists (
            select 1
            from jsonb_array_elements(r.ingredients) e
            where e->>'item' ilike '%' || q || '%'
               or e->>'notes' ilike '%' || q || '%'
          )
        )
     or (
          jsonb_typeof(r.ingredients_es) = 'array'
          and exists (
            select 1
            from jsonb_array_elements(r.ingredients_es) e
            where e->>'item' ilike '%' || q || '%'
               or e->>'notes' ilike '%' || q || '%'
          )
        );
$$;

-- PostgREST exposes functions to whichever roles can EXECUTE them. Reads are
-- public, so let the browser (anon) and server call it.
grant execute on function public.search_recipes(text) to anon, authenticated, service_role;
