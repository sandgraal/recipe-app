-- ThumbHash placeholder for the cover image: a ~20-30 byte hash (stored base64)
-- that renders as a smooth, aspect-correct blur while the real image loads —
-- kills the grey flash / layout shift on cards and the detail hero. Computed
-- server-side from image_url on write (see src/lib/thumbhashServer.ts).
alter table public.recipes add column if not exists image_thumbhash text;
