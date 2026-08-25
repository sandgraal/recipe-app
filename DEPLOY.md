# Deploy Creaciones Colibrí to Vercel

## One-time setup

### 1. Get an Anthropic API key
https://console.anthropic.com → API Keys → Create Key. Copy the key (starts with `sk-ant-…`). Needed for the AI features (import / identify / chat / translate).

### 2. Deploy via the Vercel CLI

```bash
# From the project root
npm install -g vercel   # if you don't have it
vercel                  # follow the prompts — link to "sandgraal's projects"
```

### 3. Set environment variables
Add these in the Vercel dashboard (Project → Settings → Environment Variables) or via `vercel env add`:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public — Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public — Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only; required for writes (the recipes table is RLS-locked). |
| `ADMIN_PASSWORD` | **Secret.** Gates writes/imports/admin login. In production, writes **default-deny** until this is set. |
| `ANTHROPIC_API_KEY` | **Secret.** AI features. |
| `NEXT_PUBLIC_SITE_URL` | Optional — canonical origin (defaults to the prod URL). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional — shared-store rate limiting for public AI routes; falls back to an in-memory limiter if unset. |

### 4. Deploy to production
```bash
vercel --prod
```

Vercel gives you a URL like `https://recipe-app-xxx.vercel.app`. Subsequent pushes to `main` deploy automatically.

## Local development
```bash
cp .env.local.example .env.local
# fill in the values above
npm install
npm run dev
# open http://localhost:3000
```

Reading/browsing only needs the two public `NEXT_PUBLIC_SUPABASE_*` values. AI features need `ANTHROPIC_API_KEY`; writing/importing needs `ADMIN_PASSWORD` (and `SUPABASE_SERVICE_ROLE_KEY`).

## What's already set up
- **Supabase project:** `recipe-book` (ref `cjnwvxtomwyszcfuvgpw`, us-east-1)
- **Database:** `recipes` and `meal_groups` tables — schema in `supabase/migrations/`
- **Storage bucket:** `recipe-images` (public read)
- **Access control:** the recipes table is RLS-locked; reads are public, writes go through the service-role key and are gated by `ADMIN_PASSWORD` (admin cookie or `Authorization: Bearer <ADMIN_PASSWORD>`).

## Applying database migrations
Migrations in `supabase/migrations/` are applied to the project via the Supabase CLI (`supabase db push`) or the dashboard SQL editor. They are idempotent (`if not exists` / `drop … if exists` guards) so re-running is safe.
