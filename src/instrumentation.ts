/**
 * Next.js instrumentation hook — runs once on server startup. We use it to
 * validate environment configuration early (non-throwing; logs warnings).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    validateEnv();
  }
}
