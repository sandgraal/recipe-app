// Time helpers shared by the structured taxonomy, the browse "under N minutes"
// filters (Phase 1), and the Recipe JSON-LD. `total_time` is stored as a
// human string (e.g. "1 hour 30 minutes", "45 min", "3 days" for ferments);
// these turn it into whole minutes and ISO-8601 durations.

/**
 * Parse a human total-time string into whole minutes, or null when nothing
 * numeric is present. Days/weeks (used by ferments like kombucha) intentionally
 * expand into large minute counts so an "under 30 minutes" filter excludes them.
 */
export function parseMinutes(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = text.toLowerCase();
  let total = 0;
  let found = false;
  const add = (unit: RegExp, mult: number) => {
    const g = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${unit.source})`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = g.exec(s)) !== null) {
      total += parseFloat(m[1]) * mult;
      found = true;
    }
  };
  add(/weeks?|wks?/, 60 * 24 * 7);
  add(/days?/, 60 * 24);
  add(/hours?|hrs?|h\b/, 60);
  add(/minutes?|mins?|min|m\b/, 1);
  if (!found) {
    const bare = s.match(/^\s*(\d+)\s*$/);
    return bare ? parseInt(bare[1], 10) : null;
  }
  return Math.round(total);
}

/** Whole minutes → ISO-8601 duration (90 → "PT1H30M"), or undefined when ≤ 0.
 *  Non-integer input is rounded to a whole minute first, so a value like 119.6
 *  becomes "PT2H" rather than an invalid "PT1H60M". */
export function isoFromMinutes(min: number | null | undefined): string | undefined {
  if (min == null || !Number.isFinite(min) || min <= 0) return undefined;
  const whole = Math.round(min);
  if (whole <= 0) return undefined;
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  const out = `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
  return out === 'PT' ? undefined : out;
}
