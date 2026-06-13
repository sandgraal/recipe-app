/**
 * Minimal structured logger. Emits one JSON line per event so logs are
 * greppable/filterable in Vercel's log viewer (we deliberately don't ship an
 * external error tracker). Replaces scattered console.error + silent catches.
 */
type Level = 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  let line: string;
  try {
    line = JSON.stringify({ ...(ctx ?? {}), level, msg });
  } catch {
    line = JSON.stringify({ level, msg });
  }
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
};
