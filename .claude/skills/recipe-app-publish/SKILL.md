---
name: recipe-app-publish
description: Add, update or find recipes (with photos) on the Creaciones Colibrí recipe app at recipe-app-blush-eta.vercel.app. Use whenever the user wants to add, save, post, publish, edit, fix or update a recipe on their recipe site/app, including "add this to my recipe app", "save this recipe", "put this on the site", "add it with pictures", or when they hand over a dish (chat, photo, URL or text) and ask to publish it.
---

# Publish to the Recipe App

Writes to the live app are password-protected. The script handles the password; you never need to ask the user for it unless `--check` fails.

## Every time, in this order

1. **Preflight.** Run:
   ```bash
   python3 scripts/publish_recipe.py --check
   ```
   Expect `OK: writes are authorized.` If it prints `FAIL` or `No valid admin credential`, follow the message it prints (it lists the 4 places the credential is read from). Do not guess passwords. Do not rewrite this skill or the script. Do not tell the user the API changed: a 401 means the credential is missing or wrong.

2. **Build the recipe JSON.** Read `references/recipe-schema.md` for field shapes (ingredients are `{amount, unit, item, notes}`, steps are `{order, text}`). Write it to a file such as `recipe.json` in a scratch directory.

3. **Images.** Local files go in with `--image` (first one is the cover, all go in the gallery). External `https://` URLs can instead go straight into `image_url` / `gallery_images`. No images is fine; the app shows a placeholder.

4. **Publish:**
   ```bash
   python3 scripts/publish_recipe.py recipe.json --image /path/photo.jpg
   ```
   Add `--dry-run` first if unsure: it validates and uploads images without creating the recipe.

5. **Report** the `Live URL` the script prints and whether the cover was set.

## Updating an existing recipe

Never re-run publish to fix something; it creates a duplicate row.

```bash
python3 scripts/publish_recipe.py --find "olive meatballs"      # prints: <id>  <title>
python3 scripts/publish_recipe.py --update <id> patch.json      # partial update
```

`patch.json` holds only the fields to change (for example `{"total_time": "50 min"}`). Arrays such as `ingredients` and `steps` are replaced whole, so send the complete array. Add `--image` to replace the cover/gallery.

## Where the credential comes from

The script reads the admin password from the first of: env `RECIPE_ADMIN_TOKEN`, env `ADMIN_PASSWORD`, `config.json` in this skill's folder (`{"admin_token": "..."}`), `~/.config/recipe-app/token`. In Claude Code cloud sessions the network proxy can inject it instead (the user approves a credential for host `recipe-app-blush-eta.vercel.app`; then no local copy exists and `--check` still passes). Never print the token, never commit it, never put it in a recipe.

## Notes

- Recipes are not idempotent, images are. Each publish creates a new row.
- `total_time` is a free-text string (`"45 min"`). `servings` is an integer. `source_type` is one of `manual | url | text | photo | chat`.
- Leave the Spanish `_es` fields out. The server translates on create.
- The anon key in the script is a public `NEXT_PUBLIC_` value, not a secret.
- Source of truth for this skill is `.claude/skills/recipe-app-publish/` in the recipe-app repo. A claude.ai upload is built from it with `scripts/build-skill-zip.sh`.
