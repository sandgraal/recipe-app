-- Private archive for recipes taken off the public site (Finca Colibrí ADR 0011).
--
-- The owners keep their sauce/ferment formulas privately in the Finca hub ("Cocina", finca_docs col 'formulas',
-- id 'pub-<recipe id>'). When a public recipe comes off the site its full row is kept here, never destroyed, together with
-- the meal plans it was in and its position there, so it can be put back exactly.
--
-- Nobody but the service role (and the dashboard) can read it: RLS on, no policies, and no grants to anon/authenticated.
--
-- Restore one recipe (run as postgres):
--   insert into public.recipes select (jsonb_populate_record(null::public.recipes, row)).* from public.recipes_archive where id = '<id>';
--   -- then put the id back into each meal plan listed in meal_groups (slug, position) and delete the archive row.

create table if not exists public.recipes_archive (
  id          uuid primary key,
  row         jsonb not null,
  meal_groups jsonb not null default '[]'::jsonb,  -- [{ "slug": ..., "position": n }] the recipe was removed from
  reason      text,
  archived_at timestamptz not null default now()
);

alter table public.recipes_archive enable row level security;
revoke all on public.recipes_archive from anon, authenticated;
