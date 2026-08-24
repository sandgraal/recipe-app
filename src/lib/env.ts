import { z } from 'zod';
import { logger } from '@/lib/logger';
import { isProduction } from '@/lib/runtime';

/**
 * Environment validation. Intentionally LENIENT — it warns about
 * missing/malformed values rather than throwing, so a misconfigured deploy
 * still boots (and individual features degrade gracefully) instead of hard-
 * failing. Surfaces issues early in the logs. Called from instrumentation.ts.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export function validateEnv(): void {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    logger.warn('env: validation issues', { fieldErrors: result.error.flatten().fieldErrors });
  }
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) logger.warn('env: missing recommended variables', { missing });

  // In production, writes/admin/AI-write endpoints are DENIED without this
  // (writeAllowed default-denies). Surface it loudly so a forgotten env is
  // obvious in the logs rather than a silent "admin doesn't work".
  if (isProduction() && !process.env.ADMIN_PASSWORD) {
    logger.error('env: ADMIN_PASSWORD is not set in production — write/admin/import endpoints are DENIED until it is set.');
  }
}
