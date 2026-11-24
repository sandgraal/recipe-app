# Recipe JSON schema (app's native shape)

The `/api/recipes` POST body maps directly to the `recipes` table. Build JSON in
exactly this shape. Only `title` is strictly required; everything else has sane
defaults but a real recipe should fill most of it.

```json
{
  "title": "Green Olive Meatballs over Fusilli",
  "description": "One-line summary shown under the title.",
  "servings": 4,
  "total_time": "1 hour",
  "cuisine": "Italian",
  "tags": ["Mains", "Pasta", "Beef"],
  "ingredients": [
    {"amount": "500", "unit": "g", "item": "ground beef", "notes": null},
    {"amount": "1/2", "unit": "cup", "item": "green stuffed olives", "notes": "finely chopped"},
    {"amount": "1", "unit": "", "item": "large egg", "notes": null}
  ],
  "steps": [
    {"order": 1, "text": "First instruction."},
    {"order": 2, "text": "Second instruction."}
  ],
  "notes": "Tips, substitutions, make-ahead guidance.",
  "source_type": "manual",
  "image_url": "https://.../cover.jpg",
  "gallery_images": ["https://.../cover.jpg", "https://.../step.jpg"]
}
```

## Field rules

- **title** (string, required).
- **description / notes** (string or null).
- **servings** (integer or null).
- **total_time** (free-text string): `"45 min"`, `"1 hour 30 minutes"`, `"42 days"`. Not a number.
- **cuisine** (string or null).
- **tags** (string array). Used for the homepage rows and search.
- **ingredients** (array of `{amount, unit, item, notes}`):
  - `amount` and `unit` are **strings**. Put the number in `amount` (`"1/2"`, `"2"`, `"1 1/2"`).
  - Leave `unit` as `""` for countable items (eggs, cloves, peppers); the counting noun goes in `item` or as the unit word (`"cloves"`, `"slices"`).
  - `notes` is optional prep detail (`"finely chopped"`); use `null` if none.
  - The app's servings scaler parses `amount`, so keep it numeric-ish (fractions and `½`-style glyphs both parse).
- **steps** (array of `{order, text}`): 1-based `order`, plain-text `text`. The app auto-detects times in the text (e.g. "simmer 15 minutes") to render a timer, so phrase durations naturally inside the step.
- **source_type**: one of `manual | url | text | photo | chat`. Use `manual` for a recipe composed in chat, `photo` if extracted from an image, `url` if scraped.
- **image_url / gallery_images**: public `https://` URLs. The script fills these from `--image` uploads; only set them by hand when using external URLs.

## What not to include

- Omit the Spanish `_es` fields (`title_es`, `steps_es`, etc.) and `translated_at` — the app generates translations on demand from its own UI.
- Omit `id`, `created_at`, `updated_at` — the server sets these.
