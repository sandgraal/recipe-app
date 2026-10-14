import { describe, it, expect, afterEach } from 'vitest';
import { AI_MAX_TOKENS, AI_PROBLEM_TEXT, DEFAULT_AI_MODEL, aiModel, parseJsonObject, problemText, readOutcome, textOf } from './ai';
import { jsonMessage, message, refusalMessage, text, thinking, truncatedMessage } from './testing/aiMessages';

afterEach(() => { delete process.env.AI_MODEL; });

describe('aiModel', () => {
  it('is Haiku 5.5 with no date suffix', () => {
    expect(DEFAULT_AI_MODEL).toBe('claude-haiku-5-5');
    expect(aiModel()).toBe('claude-haiku-5-5');
  });
  it('can be overridden with AI_MODEL', () => {
    process.env.AI_MODEL = ' claude-sonnet-5-5 ';
    expect(aiModel()).toBe('claude-sonnet-5-5');
  });
  it('ignores an empty AI_MODEL', () => {
    process.env.AI_MODEL = '  ';
    expect(aiModel()).toBe(DEFAULT_AI_MODEL);
  });
});

describe('textOf', () => {
  it('skips thinking blocks instead of taking content[0]', () => {
    expect(textOf(message({ content: [thinking('hmm'), text('Hola'), text(' mundo')] }))).toBe('Hola mundo');
  });
  it('is empty when there is no text block', () => {
    expect(textOf(message({ content: [thinking()] }))).toBe('');
  });
});

describe('readOutcome', () => {
  it('ok: the text behind a thinking block', () => {
    expect(readOutcome(message({ content: [thinking(), text('  hi ')] }))).toEqual({ kind: 'ok', text: 'hi' });
  });
  it('refusal: carries the category and ignores any text', () => {
    expect(readOutcome(refusalMessage('cyber'))).toEqual({ kind: 'refusal', category: 'cyber' });
    expect(readOutcome(refusalMessage(null))).toEqual({ kind: 'refusal', category: null });
    expect(readOutcome(message({ stop_reason: 'refusal', content: [text('partial')], stop_details: null })))
      .toEqual({ kind: 'refusal', category: null });
  });
  it('max_tokens: keeps the partial text, which must not be treated as complete', () => {
    expect(readOutcome(truncatedMessage('{"a":'))).toEqual({ kind: 'max_tokens', text: '{"a":' });
    expect(readOutcome(truncatedMessage(''))).toEqual({ kind: 'max_tokens', text: '' });
  });
  it('empty: finished without any text', () => {
    expect(readOutcome(message({ content: [thinking()] }))).toEqual({ kind: 'empty' });
  });
});

describe('parseJsonObject', () => {
  it('parses a bare JSON object (structured output)', () => {
    expect(parseJsonObject(JSON.stringify({ a: 1 }))).toEqual({ a: 1 });
    expect(parseJsonObject(textOf(jsonMessage({ b: 2 })))).toEqual({ b: 2 }); // behind a thinking block
  });
  it('digs the object out of a fence or surrounding prose', () => {
    expect(parseJsonObject('Here:\n```json\n{"a": [1]}\n```')).toEqual({ a: [1] });
  });
  it('returns null for arrays, scalars and broken JSON', () => {
    expect(parseJsonObject('[1,2]')).toBeNull();
    expect(parseJsonObject('42')).toBeNull();
    expect(parseJsonObject('{"a":')).toBeNull();
    expect(parseJsonObject('')).toBeNull();
  });
});

describe('problemText', () => {
  it('has Spanish and English for every problem', () => {
    for (const p of Object.values(AI_PROBLEM_TEXT)) {
      expect(p.es.length).toBeGreaterThan(10);
      expect(p.en.length).toBeGreaterThan(10);
      expect(p.es).not.toBe(p.en);
    }
  });
  it('uses the given language, or both (Spanish first) when it is unknown', () => {
    expect(problemText('refusal', 'es')).toBe(AI_PROBLEM_TEXT.refusal.es);
    expect(problemText('refusal', 'en')).toBe(AI_PROBLEM_TEXT.refusal.en);
    expect(problemText('refusal')).toBe(`${AI_PROBLEM_TEXT.refusal.es} / ${AI_PROBLEM_TEXT.refusal.en}`);
    expect(problemText('max_tokens', 'fr')).toContain(' / ');
  });
});

describe('output ceilings leave room for thinking tokens', () => {
  it('are at least the agreed minimums', () => {
    expect(AI_MAX_TOKENS.extract).toBeGreaterThanOrEqual(8000);
    expect(AI_MAX_TOKENS.translate).toBeGreaterThanOrEqual(16000);
    expect(AI_MAX_TOKENS.chat).toBeGreaterThanOrEqual(1500);
  });
});
