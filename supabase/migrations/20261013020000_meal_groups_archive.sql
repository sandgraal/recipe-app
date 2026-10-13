-- Private archive for meal plans taken off the public site (owner cleanup, 2026-10-13). Same pattern as recipes_archive:
-- the full row is kept so a plan can be put back exactly; nobody but the service role (and the dashboard) can read it.
--
-- Restore one plan (run as postgres):
--   insert into public.meal_groups select (jsonb_populate_record(null::public.meal_groups, row)).* from public.meal_groups_archive where slug = '<slug>';
--   -- then delete its archive row.

create table if not exists public.meal_groups_archive (
  slug        text primary key,
  row         jsonb not null,
  reason      text,
  archived_at timestamptz not null default now()
);

alter table public.meal_groups_archive enable row level security;
revoke all on public.meal_groups_archive from anon, authenticated;
