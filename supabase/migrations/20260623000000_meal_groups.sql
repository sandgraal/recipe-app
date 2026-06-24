-- Meal groups: curated sets of recipes meant to be cooked/served together,
-- with a shared timing/coordination note. The recipe detail page looks up the
-- group a recipe belongs to and renders a "Make it a meal" card linking the
-- other members. Read-only to the public (like recipes); writes go through the
-- service role.
create table if not exists public.meal_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_es text,
  note text,
  note_es text,
  recipe_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.meal_groups enable row level security;
drop policy if exists "Public read meal_groups" on public.meal_groups;
create policy "Public read meal_groups" on public.meal_groups for select using (true);
grant select on public.meal_groups to anon, authenticated;
