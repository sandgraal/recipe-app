/**
 * A tiny programmable stand-in for the Supabase query builder, for route tests.
 *
 * Every `from(table)` call returns a chainable builder. The chain's verb
 * (select / insert / update / upsert / delete) picks the handler `"<table>.<verb>"`
 * (the LAST verb used wins, so `.insert(...).select()` resolves as `insert`);
 * the handler gets the recorded call and returns `{ data, error }`.
 */
export interface Call { table: string; verb: string; args: unknown[]; filters: Array<[string, unknown[]]> }
export type Result = { data: unknown; error: { message: string; code?: string } | null };
export type Handler = (call: Call) => Result | Promise<Result>;

export function makeFakeSupabase(handlers: Record<string, Handler>) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, verb: 'select', args: [], filters: [] };
    const run = async (): Promise<Result> => {
      calls.push(call);
      const h = handlers[`${table}.${call.verb}`];
      if (!h) return { data: null, error: { message: `no handler for ${table}.${call.verb}` } };
      return h(call);
    };
    const builder: Record<string, unknown> = {};
    for (const verb of ['insert', 'update', 'upsert', 'delete']) {
      builder[verb] = (...args: unknown[]) => { call.verb = verb; call.args = args; return builder; };
    }
    builder.select = (...args: unknown[]) => { if (call.verb === 'select') call.args = args; return builder; };
    for (const f of ['eq', 'in', 'not', 'order', 'limit', 'overlaps']) {
      builder[f] = (...args: unknown[]) => { call.filters.push([f, args]); return builder; };
    }
    builder.single = () => run();
    builder.maybeSingle = () => run();
    builder.then = (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) => run().then(res, rej);
    return builder;
  };
  return { client: { from }, calls };
}
