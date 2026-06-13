/**
 * Cookie names shared by server auth (adminAuth.ts, /api/auth/*) and the client
 * (useAdmin). Kept dependency-free so importing it into a client component does
 * NOT pull `next/server` into the browser bundle.
 */
export const ADMIN_COOKIE = 'colibri_admin'; // httpOnly session (the secret)
export const ADMIN_UI_COOKIE = 'colibri_admin_ui'; // non-secret UI hint
