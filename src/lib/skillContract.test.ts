import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ADMIN_COOKIE } from '@/lib/authConstants';

/**
 * The publish skill once told agents "no credentials are needed" after the API
 * started requiring ADMIN_PASSWORD, so every agent failed with 401. These checks
 * keep the skill, the agent instructions and the server saying the same thing.
 */
const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const SKILL = '.claude/skills/recipe-app-publish';

describe('recipe-app-publish skill matches the server', () => {
  it('ships its files', () => {
    for (const f of ['SKILL.md', 'scripts/publish_recipe.py', 'references/recipe-schema.md']) {
      expect(existsSync(path.join(root, SKILL, f)), f).toBe(true);
    }
  });

  it('does not claim writes are open', () => {
    const skill = read(`${SKILL}/SKILL.md`).toLowerCase();
    expect(skill).not.toMatch(/no credentials are needed|no auth\b|open write access/);
    expect(skill).toContain('--check');
  });

  it('script authenticates writes and can verify the credential', () => {
    const py = read(`${SKILL}/scripts/publish_recipe.py`);
    expect(py).toContain('"Authorization"');
    expect(py).toContain('Bearer');
    expect(py).toContain('RECIPE_ADMIN_TOKEN');
    expect(py).toContain('/api/auth/check');
    expect(py).toContain('"PUT"');
    // cookie fallback for when a proxy overwrites the Authorization header
    expect(py).toContain('/api/auth/login');
    expect(py).toContain(`SESSION_COOKIE = "${ADMIN_COOKIE}"`);
  });

  it('the endpoints the script calls exist', () => {
    for (const f of ['src/app/api/auth/check/route.ts', 'src/app/api/recipes/route.ts', 'src/app/api/recipes/[id]/route.ts']) {
      expect(existsSync(path.join(root, f)), f).toBe(true);
    }
  });

  it('CLAUDE.md points agents at the skill and the credential', () => {
    const md = read('CLAUDE.md');
    expect(md).toContain('recipe-app-publish');
    expect(md).toContain('RECIPE_ADMIN_TOKEN');
    expect(md).toContain('--check');
    expect(read('AGENTS.md')).toContain('CLAUDE.md');
  });

  it('never commits a credential', () => {
    const ignore = read('.gitignore');
    expect(ignore).toContain(`${SKILL}/config.json`);
    expect(ignore).toContain('/dist');
  });
});
