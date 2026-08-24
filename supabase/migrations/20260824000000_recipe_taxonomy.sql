-- Structured taxonomy for recipes: first-class category, region (split out of
-- cuisine), dietary flags, difficulty, and numeric prep/cook/total minutes.
--
-- Every column is nullable + additive, so existing rows and older code keep
-- working unchanged. Controlled vocab is enforced with CHECK constraints rather
-- than native enums: CHECKs are transaction-safe and easy to grow (drop + re-add),
-- whereas `ALTER TYPE ... ADD VALUE` can't run inside a transaction on every PG
-- version. The human-readable `total_time` column is kept for display; the new
-- `*_time_min` integers power "under N minutes" filtering and richer JSON-LD.

alter table public.recipes add column if not exists category text;
alter table public.recipes add column if not exists region text;
alter table public.recipes add column if not exists dietary text[] default '{}'::text[];
alter table public.recipes add column if not exists difficulty text;
alter table public.recipes add column if not exists prep_time_min integer;
alter table public.recipes add column if not exists cook_time_min integer;
alter table public.recipes add column if not exists total_time_min integer;

-- Controlled vocabulary. The `IS NULL OR ...` shape lets un-classified rows pass.
alter table public.recipes drop constraint if exists recipes_category_check;
alter table public.recipes add constraint recipes_category_check
  check (category is null or category in (
    'Mains', 'Sides', 'Soups', 'Salads', 'Breakfast', 'Desserts',
    'Drinks', 'Sauces', 'Preserves', 'Snacks', 'Appetizers', 'Breads'
  ));

alter table public.recipes drop constraint if exists recipes_difficulty_check;
alter table public.recipes add constraint recipes_difficulty_check
  check (difficulty is null or difficulty in ('easy', 'medium', 'hard'));

-- Indexes for the faceted browse queries (Phase 1).
create index if not exists recipes_category_idx on public.recipes (category);
create index if not exists recipes_region_idx on public.recipes (region);
create index if not exists recipes_difficulty_idx on public.recipes (difficulty);
create index if not exists recipes_total_time_min_idx on public.recipes (total_time_min);
create index if not exists recipes_dietary_gin on public.recipes using gin (dietary);
