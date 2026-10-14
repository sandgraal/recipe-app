import { describe, it, expect } from 'vitest';
import { IDENTIFY_SCHEMA, RECIPE_SCHEMA, SUGGESTIONS_SCHEMA, TRANSLATION_SCHEMA } from './aiSchemas';

type Node = Record<string, unknown>;

/** Structured outputs: closed objects listing every property as required; no length/range keywords. */
function check(node: unknown, path: string, problems: string[]) {
  if (!node || typeof node !== 'object') return;
  const n = node as Node;
  if (n.type === 'object') {
    const props = Object.keys((n.properties as Node) ?? {});
    if (n.additionalProperties !== false) problems.push(`${path}: additionalProperties must be false`);
    if (JSON.stringify([...(n.required as string[] ?? [])].sort()) !== JSON.stringify([...props].sort())) {
      problems.push(`${path}: required must list every property`);
    }
  }
  for (const bad of ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'multipleOf', 'pattern']) {
    if (bad in n) problems.push(`${path}: ${bad} is not supported`);
  }
  for (const [k, v] of Object.entries(n)) {
    if (Array.isArray(v)) v.forEach((x, i) => check(x, `${path}.${k}[${i}]`, problems));
    else check(v, `${path}.${k}`, problems);
  }
}

describe.each([
  ['RECIPE_SCHEMA', RECIPE_SCHEMA],
  ['IDENTIFY_SCHEMA', IDENTIFY_SCHEMA],
  ['SUGGESTIONS_SCHEMA', SUGGESTIONS_SCHEMA],
  ['TRANSLATION_SCHEMA', TRANSLATION_SCHEMA],
])('%s', (_name, schema) => {
  it('follows the structured-output rules', () => {
    const problems: string[] = [];
    check(schema, 'root', problems);
    expect(problems).toEqual([]);
  });
});

describe('RECIPE_SCHEMA', () => {
  it('has the fields the import routes and POST /api/recipes use', () => {
    expect(Object.keys(RECIPE_SCHEMA.properties).sort()).toEqual(
      ['cuisine', 'description', 'ingredients', 'notes', 'servings', 'steps', 'tags', 'title', 'total_time'],
    );
  });
});
