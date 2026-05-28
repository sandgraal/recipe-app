import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through API routes, Next.js internals, static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Already has a valid locale prefix — let through
  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return NextResponse.next();

  // Detect preferred locale from Accept-Language header
  const acceptLang = request.headers.get('Accept-Language') || '';
  const preferred = acceptLang.toLowerCase().startsWith('es') ? 'es' : DEFAULT_LOCALE;

  // Redirect to locale-prefixed URL (preserve query string)
  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
