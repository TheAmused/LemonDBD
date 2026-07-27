import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n, type Locale } from './i18n/config';

function getPreferredLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return i18n.defaultLocale;

  // Parse Accept-Language header according to priority weights
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, q] = lang.trim().split(';q=');
      return {
        code: locale.toLowerCase().split('-')[0], // e.g. 'en-US' -> 'en'
        q: q ? parseFloat(q) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const lang of languages) {
    if ((i18n.locales as readonly string[]).includes(lang.code)) {
      return lang.code as Locale;
    }
  }

  return i18n.defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static files, API calls, and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return;
  }

  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const preferredLocale = getPreferredLocale(request);
    return NextResponse.redirect(
      new URL(`/${preferredLocale}${pathname}`, request.url)
    );
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};