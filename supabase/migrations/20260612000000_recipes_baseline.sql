-- Baseline schema for public.recipes.
--
-- The recipes table was originally provisioned directly in the Supabase
-- dashboard, so no CREATE TABLE migration ever existed. That broke migrations
-- run against a fresh database (e.g. Supabase preview branches): the later
-- migrations reference public.recipes before anything creates it, failing with
-- `relation "public.recipes" does not exist`.
--
-- This reconstructs the original (pre-taxonomy) shape idempotently. On an
-- existing database (production) every statement is a harmless no-op; on a fresh
-- database it creates the table the later migrations build on. The structured
-- taxonomy columns are added later by 20260824000000_recipe_taxonomy.sql.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  servings integer,
  total_time text,
  cuisine text,
  tags text[] default '{}'::text[],
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  notes text,
  image_url text,
  source_url text,
  source_type text default 'manual'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  gallery_images jsonb default '[]'::jsonb,
  title_es text,
  description_es text,
  notes_es text,
  steps_es jsonb,
  ingredients_es jsonb,
  tags_es text[],
  translated_at timestamptz
);

alter table public.recipes enable row level security;

-- Public catalog is readable by anyone. Direct writes are locked down to the
-- service role later (20260613000000_lock_recipes_writes.sql), which drops the
-- wide-open write policies and revokes write grants — so this baseline only
-- establishes the read path those migrations expect to already exist.
drop policy if exists "Public read" on public.recipes;
create policy "Public read" on public.recipes for select using (true);
grant select on public.recipes to anon, authenticated;
