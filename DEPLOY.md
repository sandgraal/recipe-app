# Deploy Recipe Book to Vercel

## One-time setup (5 minutes)

### 1. Get an Anthropic API key
https://console.anthropic.com → API Keys → Create Key
Copy the key (starts with `sk-ant-...`)

### 2. Deploy via Vercel CLI

```bash
# From this directory
cd ~/Documents/Claude/Projects/Recipes/recipe-app

# Install Vercel CLI if you don't have it
npm install -g vercel

# Deploy (follow the prompts — link to your team "sandgraal's projects")
vercel

# Set your Anthropic key as a secret env var
vercel env add ANTHROPIC_API_KEY
# paste your key when prompted, select all environments
```

### 3. Redeploy with the env var
```bash
vercel --prod
```

Your app is live. Vercel will give you a URL like `https://recipe-app-xxx.vercel.app`.

## Environment variables to set on Vercel
These are already pre-filled for you (Supabase keys are public-safe):
- `NEXT_PUBLIC_SUPABASE_URL` — already in .env.local.example
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already in .env.local.example
- `ANTHROPIC_API_KEY` — **add this one manually** (it's a secret)

## Local development
```bash
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm install
npm run dev
# Open http://localhost:3000
```

## What's already set up
- Supabase project: recipe-book (us-east-1)
- Database: recipes table with full schema
- Storage bucket: recipe-images (public)
- RLS policies: open read/write (no auth — just for you)
