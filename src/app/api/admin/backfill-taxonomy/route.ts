import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { writeAllowed } from '@/lib/adminAuth';
import { CORS_HEADERS, NO_STORE } from '@/lib/cors';
import { buildTaxonomyPatch } from '@/lib/taxonomy';
import { logger } from '@/lib/logger';

/**
 * One-off (idempotent) backfill of the structured taxonomy columns for existing
 * recipes. Admin-gated exactly like the other write routes. The heuristic lives
 * in `buildTaxonomyPatch` (pure + unit-tested); this route just fetches, applies
 * the patch to rows that need it, and reports what changed.
 *
 *   Dry run (no writes):  POST /api/admin/backfill-taxonomy?dryRun=1
 *   Apply:                POST /api/admin/backfill-taxonomy
 *
 * It only fills columns that are currently empty, so re-running is safe, and it
 * never touches `tags` (ingredient auto-linking depends on the condiment tags).
 */

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...NO_STORE, ...((init?.headers as Record<string, string>) || {}) },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const SELECT_FIELDS =
  'id,title,tags,cuisine,steps,total_time,category,region,dietary,difficulty,total_time_min';

export async function POST(req: NextRequest) {
  if (!writeAllowed(req)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dryRun = ['1', 'true', 'yes'].includes((searchParams.get('dryRun') || '').toLowerCase());

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('recipes').select(SELECT_FIELDS);
  if (error) return json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<{
    id: string; title: string; tags?: string[] | null; cuisine?: string | null;
    steps?: { order: number; text: string }[] | null; total_time?: string | null;
    category?: string | null; region?: string | null; dietary?: string[] | null;
    difficulty?: string | null; total_time_min?: number | null;
  }>;

  const proposals: Array<{ id: string; title: string; patch: Record<string, unknown> }> = [];
  for (const r of rows) {
    const patch = buildTaxonomyPatch(r);
    if (Object.keys(patch).length > 0) proposals.push({ id: r.id, title: r.title, patch });
  }

  if (dryRun) {
    return json({
      dryRun: true,
      scanned: rows.length,
      wouldUpdate: proposals.length,
      proposals,
    });
  }

  // Apply in bounded-concurrency batches rather than one-at-a-time, so a larger
  // catalog finishes well within the serverless timeout.
  const CONCURRENCY = 10;
  let updated = 0;
  const failures: Array<{ id: string; error: string }> = [];
  for (let i = 0; i < proposals.length; i += CONCURRENCY) {
    const batch = proposals.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async p => {
        const { error: upErr } = await supabase.from('recipes').update(p.patch).eq('id', p.id);
        return upErr ? { id: p.id, error: upErr.message } : null;
      }),
    );
    for (const r of results) {
      if (r) {
        failures.push(r);
        logger.error('backfill-taxonomy: update failed', { id: r.id, err: r.error });
      } else {
        updated += 1;
      }
    }
  }

  return json({ dryRun: false, scanned: rows.length, updated, failed: failures.length, failures });
}
