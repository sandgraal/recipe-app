import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase env vars not set: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
    }
    _client = createClient(url, key);
  }
  return _client;
}

/**
 * Server-only Supabase client for WRITES.
 *
 * The `recipes` table's RLS allows the public anon key to read only; all
 * inserts/updates/deletes must go through this service-role client, which runs
 * server-side and bypasses RLS. The service-role key is a SECRET — it must be
 * set as `SUPABASE_SERVICE_ROLE_KEY` (NOT a NEXT_PUBLIC value) and never reaches
 * the browser bundle. Only ever call this from route handlers / server code.
 *
 * Falls back to the anon client if the key is unset, so the app keeps working
 * before the service key is provisioned and the RLS lock is applied (the lock
 * migration is the switch that makes the key mandatory for writes).
 */
export function getServiceSupabase(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon for writes. Set it before applying the RLS lock or writes will fail.');
    }
    return getSupabase();
  }
  if (!_serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
      throw new Error('Supabase env var NEXT_PUBLIC_SUPABASE_URL is required.');
    }
    _serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

// Convenience singleton for client components
export const supabase = typeof window !== 'undefined'
  ? getSupabase()
  : null as unknown as SupabaseClient;
