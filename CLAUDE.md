# Recipe app: instructions for AI agents

Next.js 16 + Supabase, deployed on Vercel at https://recipe-app-blush-eta.vercel.app. See `ARCHITECTURE.md` for structure and `README.md` for env vars.

## Adding, updating or finding recipes

Use the `recipe-app-publish` skill (`.claude/skills/recipe-app-publish/`). It wraps the live API; do not hand-roll curl calls or write to Supabase directly.

Writes (`POST /api/recipes`, `PUT /api/recipes/<id>`) require `Authorization: Bearer <ADMIN_PASSWORD>`. The script adds it for you. Always start with:

```bash
python3 .claude/skills/recipe-app-publish/scripts/publish_recipe.py --check
```

It prints `OK` or tells you exactly which credential is missing. Rules:

- A 401 means the credential is missing or wrong. The API has not changed and the skill does not need rewriting. Do not edit the skill or script to work around it.
- The script reads the token from env `RECIPE_ADMIN_TOKEN`, then env `ADMIN_PASSWORD`, then `.claude/skills/recipe-app-publish/config.json` (`{"admin_token": "..."}`, gitignored), then `~/.config/recipe-app/token`.
- Claude Code cloud: the credential is normally injected by the network proxy for host `recipe-app-blush-eta.vercel.app`. If `--check` fails there, call `request_credential` for that host (the user approves a form; you never see the value) or ask the user to set `RECIPE_ADMIN_TOKEN` in the environment settings.
- Never print the token, put it in a recipe, or commit it. `.env*` and `config.json` are gitignored.
- Updating: `--find "title"` to get the id, then `--update <id> patch.json`. Never re-publish to fix a typo; it creates a duplicate.

## Changing the skill or the auth

- The skill in this repo is the source of truth. A claude.ai copy is built from it with `scripts/build-skill-zip.sh` (needs `RECIPE_ADMIN_TOKEN` in the environment) and uploaded by the user. Edits to a synced copy under `~/.claude/skills/synced` are overwritten.
- If you change how write auth works (`src/lib/adminAuth.ts`), update the skill, this file and `src/app/api/auth/check/route.ts` in the same change. `src/lib/skillContract.test.ts` fails CI when the skill text drifts from the server.

## Checks before finishing code changes

```bash
npm run lint && npm run typecheck && npm test
```
