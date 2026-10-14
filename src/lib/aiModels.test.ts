import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Guard: the app talks to one model (Haiku 5.5) through src/lib/ai.ts. No
 * route may hard-code an older id, a dated id, or a request field that Haiku
 * 5.5 answers with a 400 (assistant prefill, budget_tokens, sampling params,
 * forced tool_choice).
 */
const ROOT = path.resolve(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !full.includes(`${path.sep}testing${path.sep}`) ? [full] : [];
  });
}

// Comments may name the rejected fields while explaining why they are absent.
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const sources = files(ROOT).map(f => ({ file: path.relative(ROOT, f), code: stripComments(readFileSync(f, 'utf8')) }));
const matches = (re: RegExp) => sources.filter(s => re.test(s.code)).map(s => s.file);

describe('Anthropic calls', () => {
  it('have no model id outside src/lib/ai.ts and the shared default', () => {
    expect(matches(/['"`]claude-(opus|sonnet|haiku)-/)).toEqual(['lib/ai.ts']);
  });
  it('never use a date-suffixed model id', () => {
    expect(matches(/claude-[a-z0-9-]*-20\d{6}/)).toEqual([]);
  });
  it('send no field Haiku 5.5 rejects', () => {
    expect(matches(/budget_tokens|\btemperature\s*:|\btop_p\s*:|\btop_k\s*:|thinking\s*:\s*\{/)).toEqual([]);
    expect(matches(/tool_choice\s*:\s*\{\s*type\s*:\s*['"](any|tool)['"]/)).toEqual([]);
    expect(matches(/role\s*:\s*['"]assistant['"]/)).toEqual([]);
  });
  it('every file that creates a message uses the shared model helper', () => {
    const calling = sources.filter(s => /messages\.(create|stream)\(|runMessage\(/.test(s.code) && s.file !== 'lib/ai.ts');
    expect(calling.length).toBeGreaterThan(0);
    for (const s of calling) expect(s.code, s.file).toMatch(/aiModel\(\)/);
  });
});
