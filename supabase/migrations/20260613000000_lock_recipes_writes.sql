-- Lock down direct writes to public.recipes.
--
-- BEFORE: RLS was enabled but all four policies were `using (true)` for the
-- public (anon) role, so anyone with the public anon key (it ships in the
-- browser bundle) could INSERT/UPDATE/DELETE/TRUNCATE via PostgREST
-- (/rest/v1/recipes), bypassing the app's /api auth guard entirely.
--
-- AFTER: the catalog stays publicly READable, but all writes must go through
-- the server using the service-role key (which bypasses RLS) — gated by
-- ADMIN_PASSWORD in src/lib/adminAuth.ts.
--
-- ⚠️ SEQUENCING: apply this ONLY AFTER (1) SUPABASE_SERVICE_ROLE_KEY is set in
-- the deployment env and (2) the code that calls getServiceSupabase() for writes
-- is deployed. Applying it before then will make the live app's writes fail
-- (the old code writes with the anon key).

-- Drop the wide-open write policies; keep "Public read" (SELECT using true).
drop policy if exists "Public insert" on public.recipes;
drop policy if exists "Public update" on public.recipes;
drop policy if exists "Public delete" on public.recipes;

-- Belt-and-suspenders: remove table-level write grants from the anon/authenticated
-- roles so PostgREST cannot write even if a permissive policy is re-added later.
-- (service_role bypasses both grants and RLS, so server writes are unaffected.)
revoke insert, update, delete, truncate on public.recipes from anon, authenticated;
