# Creaciones Colibrí

A bilingual (English / Spanish) personal recipe collection focused on Costa Rican home cooking. It's a Next.js web app and installable PWA with faceted browsing, full-text search, meal planning, a kitchen-friendly cook mode, metric ⇄ imperial conversion, and AI-assisted recipe import — backed by Supabase.

**Live:** https://recipe-app-blush-eta.vercel.app

---

## Features

**Browse & discover**
- Faceted **Browse** (category, region, cuisine, dietary, difficulty, max time) with sortable results
- Landing pages per **category** and **region** (region is country-level max — e.g. "Costa Rica" is a region, "Costa Rican" is a cuisine)
- Keyword **Search** powered by Postgres full-text search (English + Spanish), trigram fuzzy matching, and accent-insensitive lookup
- **Meals** — curated multi-recipe menus with one combined, aisle-sorted shopping list

**In the kitchen**
- **Cook Mode** — full-screen, step-by-step, with swipe/tap navigation and a screen wake lock
- **Step timers** with an audible + vibration alarm when they finish
- **Servings scaling** that rewrites both the ingredient list and inline quantities in the steps
- **Metric ⇄ imperial** toggle — converts amounts (cups ↔ ml, oz/lb ↔ g/kg…) and oven temperatures (°F ⇄ °C)
- Kitchen-friendly **print** view

**Personal layer** (per-device, localStorage — no account needed)
- Favorites, recently-viewed, dated cook-notes, ingredient check-off, and unit-system preference

**AI-assisted** (Anthropic)
- Import a recipe from a **URL**, pasted **text**, or a **photo**
- **Identify** — "what can I cook?" from pantry ingredients
- Per-recipe **chat** (substitutions, tips, scaling) and on-demand **translation** to Spanish

**Platform**
- Installable **PWA** with an offline fallback (`manifest.json` + hand-authored service worker)
- Bilingual throughout via a locale-prefixed route tree (`/en`, `/es`)
- ThumbHash blur placeholders for images (no layout shift, no grey flashes)
- ISR-cached pages, JSON-LD structured data, sitemap, and robots

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Data | Supabase (Postgres 17 + Storage) |
| Search | Postgres FTS + `pg_trgm` + `unaccent` |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| Images | Supabase Storage · `sharp` · `thumbhash` |
| Rate limiting | Upstash Redis (optional; in-memory fallback) |
| Observability | Vercel Analytics + Speed Insights |
| Testing | Vitest (unit) · Playwright (e2e) |
| Hosting | Vercel |

Requires **Node ≥ 20.19**.

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# edit .env.local — see "Environment variables" below

# 3. Run the dev server
npm run dev
# open http://localhost:3000
```

Reading and browsing recipes only needs the two public Supabase variables. AI features need `ANTHROPIC_API_KEY`; writing/importing needs `ADMIN_PASSWORD` (and, once the RLS-lock migration is applied, `SUPABASE_SERVICE_ROLE_KEY`).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest unit suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Run Playwright e2e tests |

---

## Environment variables

Copy `.env.local.example` and fill in. `NEXT_PUBLIC_*` values are shipped to the browser; everything else is server-only.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | For writes | Server-only key; required for writes once the recipes-table RLS lock is applied. **Never** expose with a `NEXT_PUBLIC_` prefix. |
| `ADMIN_PASSWORD` | For writes/AI-writes | Gates write/import/admin endpoints and admin login. In production, writes **default-deny** until this is set. |
| `ANTHROPIC_API_KEY` | For AI features | Import, identify, chat, translate |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical origin for CORS, metadata, sitemap, JSON-LD (defaults to the prod URL) |
| `UPSTASH_REDIS_REST_URL` | Optional | Shared-store rate limiting for public AI routes; falls back to an in-memory limiter if unset |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Token for the above |

Env validation is intentionally lenient (`src/lib/env.ts`): it warns on missing/malformed values rather than crashing, so a misconfigured deploy still boots and individual features degrade gracefully.

---

## Database & migrations

Supabase Postgres project ref: `cjnwvxtomwyszcfuvgpw`. Schema lives in `supabase/migrations/` and is applied to the project via the Supabase CLI or dashboard (SQL editor / MCP). Highlights:

- `…_recipes_baseline.sql` — `recipes` table
- `…_lock_recipes_writes.sql` — RLS lock (writes go through the service-role key)
- `…_search_recipes_function.sql`, `…_search_fts.sql`, `…_search_fts_ranking.sql` — search RPC → FTS with ranking
- `…_meal_groups.sql`, `…_meal_groups_shopping_list.sql` — meal planning
- `…_recipe_taxonomy.sql` — structured `category` / `region` / `dietary` / `difficulty` / time fields + check constraints
- `…_recipe_indexes.sql` — GIN / btree indexes for facets and sorting
- `…_image_thumbhash.sql` — `image_thumbhash` column for blur placeholders

Extensions used (in the Supabase `extensions` schema): `pg_trgm`, `unaccent`.

---

## Project structure

```
src/
  app/
    [lang]/            Locale-prefixed pages (en / es)
      browse, search, category/[category], region/[region]
      meals, meals/[slug]
      recipes/[id], recipes/[id]/edit, recipes/new
      identify, import, privacy, terms
    api/               Route handlers
      recipes, recipes/[id]                CRUD
      import/{url,text,photo}              AI import
      identify, recipe-chat, translate     AI features
      auth/{login,logout}                  Admin session
      admin/backfill-taxonomy             Maintenance
    layout.tsx, sitemap.ts, robots.ts, manifest.json
  components/          UI (RecipeCard, FilterRail, CookNotes, …)
  lib/                 Domain logic
    taxonomy, browse, recipes, search helpers
    scale, convert, time                 Quantities / units / time
    schemas, requestBody, ssrf, cors     Validation & safety
    adminAuth, adminSession, rateLimit   Auth & throttling
    i18n, site, supabase, thumbhash*     Infra
    use*.ts                              Client hooks (favorites, cook-mode, …)
public/               Icons, service worker (sw.js), offline.html
supabase/migrations/  SQL schema
e2e/                  Playwright specs
```

---

## Testing

Unit tests (Vitest) live next to the code they cover in `src/lib/*.test.ts` and focus on the pure domain logic — quantity scaling, unit conversion, taxonomy derivation, search/browse helpers, i18n coverage, SSRF guards, and request validation. End-to-end smoke tests (Playwright) live in `e2e/`.

```bash
npm test          # unit
npm run test:e2e  # end-to-end
```

---

## Deployment

Hosted on Vercel; pushing to `main` triggers a production deploy. See [DEPLOY.md](DEPLOY.md) for first-time setup and the environment variables to configure in the Vercel dashboard.

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — how it fits together: rendering model, read/write data flow, search, the taxonomy/region rules, and the write-auth model.
- [DEPLOY.md](DEPLOY.md) — Vercel setup and environment configuration.
