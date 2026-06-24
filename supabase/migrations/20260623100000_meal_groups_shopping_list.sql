-- Meal pages: a stable slug URL (/meals/[slug]) and a precomputed, consolidated
-- shopping list per meal (bilingual, grouped by store aisle). The list merges
-- the member recipes' ingredients into totals and is stored as jsonb so the
-- static meal pages render it with no runtime cost. Shape:
--   [{ aisle, aisle_es, items: [{ name, name_es, qty, qty_es }] }]
alter table public.meal_groups add column if not exists slug text;
alter table public.meal_groups add column if not exists shopping_list jsonb;
create unique index if not exists meal_groups_slug_key on public.meal_groups(slug);
