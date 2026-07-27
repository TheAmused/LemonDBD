import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from './i18n/config';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static assets, API routes, and internal Next.js requests
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return;
  }

  // Check if pathname missing locale
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    // Detect preferred browser locale or fallback to default
    const acceptLanguage = request.headers.get('accept-language');
    let preferredLocale = i18n.defaultLocale;

    if (acceptLanguage) {
      if (acceptLanguage.includes('pl')) preferredLocale = 'pl';
      else if (acceptLanguage.includes('es')) preferredLocale = 'es';
    }

    return NextResponse.redirect(
      new URL(`/${preferredLocale}${pathname}`, request.url)
    );
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};