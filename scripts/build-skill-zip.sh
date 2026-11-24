#!/usr/bin/env bash
# Build the claude.ai upload for the recipe-app-publish skill, with the admin
# token embedded in config.json. The token comes from the environment and is
# written only into the zip, never into the repo.
#
#   export RECIPE_ADMIN_TOKEN='<your ADMIN_PASSWORD>'
#   bash scripts/build-skill-zip.sh
#
# Output: dist/recipe-app-publish.zip  (upload in claude.ai Settings > Skills)
set -euo pipefail

if [ -z "${RECIPE_ADMIN_TOKEN:-}" ]; then
  echo "RECIPE_ADMIN_TOKEN is not set. Export your ADMIN_PASSWORD as RECIPE_ADMIN_TOKEN and re-run." >&2
  exit 1
fi
command -v zip >/dev/null || { echo "zip is not installed" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/.claude/skills/recipe-app-publish"
OUT="$ROOT/dist/recipe-app-publish.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/recipe-app-publish" "$ROOT/dist"
cp -R "$SRC/." "$TMP/recipe-app-publish/"
rm -f "$TMP/recipe-app-publish/config.json"

# Write the token with python so quotes/backslashes in the password are escaped.
python3 - "$TMP/recipe-app-publish/config.json" <<'PY'
import json, os, sys
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump({"admin_token": os.environ["RECIPE_ADMIN_TOKEN"]}, f)
PY
chmod 600 "$TMP/recipe-app-publish/config.json"

rm -f "$OUT"
(cd "$TMP" && zip -qr "$OUT" recipe-app-publish -x '*/__pycache__/*')
echo "Wrote $OUT"
echo "Upload it in claude.ai Settings > Skills and delete the old recipe-app-publish skill."
echo "It contains your admin password: do not share or commit it. Rotate ADMIN_PASSWORD in Vercel => rebuild and re-upload."
