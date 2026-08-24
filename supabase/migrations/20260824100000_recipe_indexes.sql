-- Fill in the indexes the browse/listing queries need but the taxonomy migration
-- didn't add:
--  - GIN on `tags` — the tag facet + tag landing pages use `.contains('tags', …)`
--    (dietary already had a GIN index; tags was seq-scanning).
--  - btree on `created_at desc` — every listing orders by it.
create index if not exists recipes_tags_gin on public.recipes using gin (tags);
create index if not exists recipes_created_at_idx on public.recipes (created_at desc);
