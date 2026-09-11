import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-edge';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// Write-type API routes that must never be reached without a valid session.
// (GET on the same resources stays public — see the route handlers.)
const PROTECTED_API_PREFIXES = ['/api/players', '/api/matches', '/api/news', '/api/standings', '/api/gallery', '/api/club', '/api/upload'];

function isProtectedApiWrite(pathname: string, method: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
}

const LOCALE_PATH_RE = new RegExp(`^/(${locales.join('|')})(/.*)?$`);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- API routes: verify session for write methods, bypass next-intl ---
  if (pathname.startsWith('/api/')) {
    if (isProtectedApiWrite(pathname, request.method)) {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = await verifySessionToken(token);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // --- Admin pages: require a valid session (except the login page itself) ---
  const localeMatch = pathname.match(LOCALE_PATH_RE);
  const pathWithoutLocale = localeMatch ? localeMatch[2] || '/' : pathname;

  if (pathWithoutLocale.startsWith('/admin') && pathWithoutLocale !== '/admin/login') {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
