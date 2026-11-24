#!/usr/bin/env python3
"""
Add or update a recipe on the Creaciones Colibri recipe app.

  python3 publish_recipe.py --check
  python3 publish_recipe.py recipe.json [--image PATH ...] [--dry-run]
  python3 publish_recipe.py --update RECIPE_ID patch.json [--image PATH ...]
  python3 publish_recipe.py --find "text"

Writes need the admin password as `Authorization: Bearer <password>`.
The token is looked up, first hit wins:
  1. env RECIPE_ADMIN_TOKEN
  2. env ADMIN_PASSWORD
  3. <skill root>/config.json            {"admin_token": "..."}
  4. ~/.config/recipe-app/token          (file containing only the token)
If none is found the request is still sent without a header, because in Claude
Code cloud the network proxy can inject it. A 401 then prints this list.

Other config: RECIPE_APP_BASE, SUPABASE_URL, SUPABASE_ANON_KEY (public values).
"""
import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(SKILL_ROOT, "config.json")
TOKEN_FILE = os.path.expanduser("~/.config/recipe-app/token")


def _config():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


CFG = _config()

# --- Public config (the anon key already ships in the deployed browser bundle) ---
APP_BASE = (os.environ.get("RECIPE_APP_BASE") or CFG.get("app_base") or "https://recipe-app-blush-eta.vercel.app").rstrip("/")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://cjnwvxtomwyszcfuvgpw.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbnd2eHRvbXd5c3pjZnV2Z3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUyNTIsImV4cCI6MjA5NTQwMTI1Mn0."
    "Br0zIO86STjhS4oyskKJ4xZgDPUvI0rp89jfgnyTZK0",
)
BUCKET = "recipe-images"
VALID_SOURCE = {"manual", "url", "text", "photo", "chat"}


def find_token():
    """Return (token, where) or (None, None)."""
    for name in ("RECIPE_ADMIN_TOKEN", "ADMIN_PASSWORD"):
        v = os.environ.get(name, "").strip()
        if v:
            return v, f"env {name}"
    v = str(CFG.get("admin_token", "")).strip()
    if v:
        return v, CONFIG_PATH
    try:
        with open(TOKEN_FILE, encoding="utf-8") as f:
            v = f.read().strip()
        if v:
            return v, TOKEN_FILE
    except OSError:
        pass
    return None, None


def lookup_help():
    return (
        "No valid admin credential. Looked in, in order:\n"
        "  1. env RECIPE_ADMIN_TOKEN\n"
        "  2. env ADMIN_PASSWORD\n"
        f"  3. {CONFIG_PATH}  ({{\"admin_token\": \"...\"}})\n"
        f"  4. {TOKEN_FILE}\n"
        "Fix: put the admin password in one of those. Claude Code cloud: ask the user to approve\n"
        "a credential for host recipe-app-blush-eta.vercel.app (request_credential) or set the\n"
        "RECIPE_ADMIN_TOKEN environment variable. Do not guess passwords and do not edit this script."
    )


def _request(url, data=None, headers=None, method="GET", timeout=60):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except urllib.error.URLError as e:
        sys.exit(f"ERROR: cannot reach {url}: {e.reason}")


def api(method, path, body=None):
    """Call the app API with the admin credential when we have one."""
    headers = {"Content-Type": "application/json"}
    token, _ = find_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    status, resp = _request(f"{APP_BASE}{path}", data=data, headers=headers, method=method)
    if status == 401:
        sys.exit("ERROR: 401 Unauthorized.\n" + lookup_help())
    return status, resp


def upload_image(path):
    """Upload a local file to the public bucket; return its public URL."""
    if not os.path.isfile(path):
        sys.exit(f"ERROR: image not found: {path}")
    ctype = mimetypes.guess_type(path)[0] or "image/jpeg"
    ext = os.path.splitext(path)[1].lstrip(".").lower() or "jpg"
    key = f"recipe-{uuid.uuid4().hex[:16]}.{ext}"
    with open(path, "rb") as f:
        body = f.read()
    status, resp = _request(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{key}",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": ctype,
            "x-upsert": "true",
        },
    )
    if status not in (200, 201):
        sys.exit(f"ERROR: image upload failed ({status}): {resp.decode(errors='replace')}")
    pub = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{key}"
    print(f"  uploaded {os.path.basename(path)} -> {pub}")
    return pub


def normalize(recipe, creating):
    """Light validation + defaults. Defaults are applied only when creating."""
    if creating and not str(recipe.get("title", "")).strip():
        sys.exit("ERROR: recipe 'title' is required")
    if creating:
        recipe.setdefault("tags", [])
        recipe.setdefault("ingredients", [])
        recipe.setdefault("steps", [])
        recipe.setdefault("source_type", "manual")
    if "source_type" in recipe and recipe["source_type"] not in VALID_SOURCE:
        sys.exit(f"ERROR: source_type must be one of {sorted(VALID_SOURCE)}")
    for ing in recipe.get("ingredients") or []:
        ing.setdefault("amount", "")
        ing.setdefault("unit", "")
        ing.setdefault("item", "")
        ing.setdefault("notes", None)
    for i, step in enumerate(recipe.get("steps") or [], 1):
        step.setdefault("order", i)
        step.setdefault("text", "")
    return recipe


def load_json(path):
    raw = sys.stdin.read() if path == "-" else open(path, encoding="utf-8").read()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        sys.exit(f"ERROR: invalid JSON: {e}")


def attach_images(recipe, paths):
    if not paths:
        return
    print("Uploading images:")
    urls = [upload_image(p) for p in paths]
    recipe["image_url"] = urls[0]
    recipe["gallery_images"] = urls


def cmd_check():
    token, where = find_token()
    print(f"Credential source: {where or 'none found (relying on proxy injection, if any)'}")
    print(f"App: {APP_BASE}")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    status, resp = _request(f"{APP_BASE}/api/auth/check", headers=headers)
    if status == 200:
        print("OK: writes are authorized.")
        return
    if status == 401:
        sys.exit("FAIL: server rejected the credential (401).\n" + lookup_help())
    if status == 404:
        if token:
            print("WARN: /api/auth/check is not deployed yet, so the credential could not be verified.")
            return
        sys.exit("FAIL: /api/auth/check is not deployed and no credential was found.\n" + lookup_help())
    sys.exit(f"FAIL: unexpected status {status}: {resp.decode(errors='replace')[:300]}")


def cmd_find(text):
    status, resp = api("GET", "/api/recipes?" + urllib.parse.urlencode({"q": text}))
    if status != 200:
        sys.exit(f"ERROR: search failed ({status}): {resp.decode(errors='replace')[:300]}")
    for r in json.loads(resp).get("recipes", []):
        print(f"{r.get('id')}  {r.get('title')}")


def cmd_publish(args):
    recipe = normalize(load_json(args.recipe), creating=True)
    attach_images(recipe, args.image)
    if args.dry_run:
        print("\n--dry-run: recipe validated and images uploaded; not posting.")
        print(json.dumps(recipe, indent=2)[:1200])
        return
    status, resp = api("POST", "/api/recipes", recipe)
    if status not in (200, 201):
        sys.exit(f"ERROR: POST failed ({status}): {resp.decode(errors='replace')}")
    out = json.loads(resp)
    row = out.get("recipe") or out
    print(f"\nPublished: {recipe['title']}")
    print(f"Live URL:  {APP_BASE}/en/recipes/{row.get('id')}")
    print(f"Cover set: {bool(row.get('image_url'))}")


def cmd_update(args):
    rid, patch_path = args.update
    patch = normalize(load_json(patch_path), creating=False)
    attach_images(patch, args.image)
    if args.dry_run:
        print("--dry-run: not sending.")
        print(json.dumps(patch, indent=2)[:1200])
        return
    status, resp = api("PUT", f"/api/recipes/{rid}", patch)
    if status != 200:
        sys.exit(f"ERROR: PUT failed ({status}): {resp.decode(errors='replace')}")
    row = json.loads(resp).get("recipe") or {}
    print(f"Updated: {row.get('title')}")
    print(f"Live URL: {APP_BASE}/en/recipes/{rid}")


def main():
    ap = argparse.ArgumentParser(description="Add or update a recipe on the recipe app.")
    ap.add_argument("recipe", nargs="?", help="Path to recipe JSON, or '-' for stdin (create)")
    ap.add_argument("--image", action="append", default=[], help="Local image file (repeatable; first = cover)")
    ap.add_argument("--dry-run", action="store_true", help="Validate + upload images but do not write the recipe")
    ap.add_argument("--check", action="store_true", help="Verify the admin credential against the server, then exit")
    ap.add_argument("--update", nargs=2, metavar=("ID", "PATCH_JSON"), help="Partial update of an existing recipe (PUT)")
    ap.add_argument("--find", metavar="TEXT", help="Search recipes by text and print 'id  title' lines")
    args = ap.parse_args()

    if args.check:
        return cmd_check()
    if args.find:
        return cmd_find(args.find)
    if args.update:
        return cmd_update(args)
    if not args.recipe:
        ap.error("give a recipe JSON path, or use --check / --find / --update")
    return cmd_publish(args)


if __name__ == "__main__":
    main()
