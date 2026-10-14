# Deploy Creaciones Colibrí to Vercel

## One-time setup

### 1. Get an Anthropic API key
https://console.anthropic.com → API Keys → Create Key. Copy the key (starts with `sk-ant-…`). Needed for the AI features (import / identify / chat / translate). All of them use Claude Haiku 5.5 ($0.10 / $0.50 per million input / output tokens for prompts up to 100K tokens).

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
| `ADMIN_PASSWORD` | **Secret.** Gates writes/imports/admin login and signs the admin session cookie (also required for the finca sign-in). In production, writes **default-deny** until this is set. |
| `FINCA_ID` | Optional — finca whose editors/admins can sign in with their Finca Colibrí account (default `colibri`). |
| `ANTHROPIC_API_KEY` | **Secret.** AI features, including the Cocina chat (reused; nothing new to set). |
| `HUB_ORIGINS` | Optional — comma-separated origins of the finca hub allowed to call `POST /api/cocina/chat` (default `https://sandgraal.github.io,http://localhost:5173,http://localhost:4173`). Only that route reads it. |
| `AI_MODEL` | Optional — model for every AI call: import, identify, chat, translate and the Cocina chat (default `claude-haiku-5-5`, no date suffix). |
| `COCINA_CHAT_MODEL` | Optional — model for the Cocina chat only; wins over `AI_MODEL` (default: `AI_MODEL`). |
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
- **Access control:** the recipes table is RLS-locked; reads are public, writes go through the service-role key and are gated by the admin cookie or `Authorization: Bearer <ADMIN_PASSWORD>`. The cookie is issued by `POST /api/auth/login` after either a finca account sign-in (Supabase Auth token verified server-side + `public.finca_can_write(FINCA_ID)` returns true) or the admin password. No Supabase Auth dashboard changes or redirect URLs are needed (email + password only, no OAuth/magic links); the shared `finca_can_write` function must exist and be executable by `authenticated`.

## Applying database migrations
Migrations in `supabase/migrations/` are applied to the project via the Supabase CLI (`supabase db push`) or the dashboard SQL editor. They are idempotent (`if not exists` / `drop … if exists` guards) so re-running is safe.
