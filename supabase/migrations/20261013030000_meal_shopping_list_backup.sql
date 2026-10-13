-- Backup of each meal plan's saved shopping list before it was rebuilt from its recipes (owner cleanup, 2026-10-13).
-- Private like the archives. Restore one: update public.meal_groups set shopping_list = b.shopping_list
--   from public.meal_shopping_list_backup b where meal_groups.slug = b.slug and b.slug = '<slug>';
create table if not exists public.meal_shopping_list_backup (
  slug          text not null,
  shopping_list jsonb not null,
  saved_at      timestamptz not null default now(),
  primary key (slug, saved_at)
);
alter table public.meal_shopping_list_backup enable row level security;
revoke all on public.meal_shopping_list_backup from anon, authenticated;
