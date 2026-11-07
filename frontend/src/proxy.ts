// frontend/src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n, type Locale } from '@/i18n/config';
import { adminOnlyPageFromPathname, adminPanelLocaleFromPathname } from '@/utils/adminOnlyPages';
import { STREAK_ROLE_COOKIE, resolveStreakRole } from '@/utils/streakRole';

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

/** Where the Next server reaches the backend. NEXT_PUBLIC_API_URL is the browser-facing address
 * (https://localhost inside a container points back at the frontend itself), so it is not used. */
const BACKEND_URL = (process.env.INTERNAL_API_URL || 'http://backend:5000').replace(/\/+$/, '');

/**
 * Is the visitor a signed-in admin? A visitor without a session cookie is answered without
 * asking the backend. If the backend can't answer, the answer is "no": an admin-only page stays closed.
 */
async function viewerIsAdmin(cookie: string): Promise<boolean> {
    if (!cookie) return false;
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
            headers: { cookie },
            cache: 'no-store',
            signal: AbortSignal.timeout(1500),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as { user?: { role?: string } | null };
        return body.user?.role === 'admin';
    } catch {
        return false;
    }
}

/** The language a signed-in visitor saved on their account, or null (no session, backend down, none saved). */
async function viewerPreferredLocale(cookie: string): Promise<Locale | null> {
    if (!cookie) return null;
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
            headers: { cookie },
            cache: 'no-store',
            signal: AbortSignal.timeout(1500),
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { user?: { preferred_language?: string | null } | null };
        const language = body.user?.preferred_language;
        return (i18n.locales as readonly string[]).includes(language ?? '') ? (language as Locale) : null;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Gated pages are checked before the "has a dot, so it's a static file" shortcut below: a path
    // like `/en/minigames/x.y` used to skip the gate entirely.
    const adminOnly = adminOnlyPageFromPathname(pathname, i18n.locales);
    const adminPanelLocale = adminPanelLocaleFromPathname(pathname, i18n.locales);
    if ((adminOnly || adminPanelLocale) && !(await viewerIsAdmin(request.headers.get('cookie') ?? ''))) {
        // Admin-only pages show Blocked (still in development); the admin panel shows Forbidden.
        const target = adminOnly ? `/${adminOnly.locale}/blocked` : `/${adminPanelLocale}/forbidden`;
        const response = NextResponse.rewrite(new URL(target, request.url));
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }

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
        // A signed-in user's saved language wins over the browser's Accept-Language.
        const preferredLocale =
            (await viewerPreferredLocale(request.headers.get('cookie') ?? '')) ?? getPreferredLocale(request);
        return NextResponse.redirect(
            new URL(`/${preferredLocale}${pathname}`, request.url)
        );
    }

    // A bare /streaks goes straight to the remembered role tab. Redirecting from the page instead arrives
    // after the layout has streamed, so the tabs paint the wrong role (survivor) before jumping.
    const streaksLocale = i18n.locales.find((l) => pathname === `/${l}/streaks` || pathname === `/${l}/streaks/`);
    if (streaksLocale) {
        const role = resolveStreakRole(request.cookies.get(STREAK_ROLE_COOKIE)?.value);
        const response = NextResponse.redirect(new URL(`/${streaksLocale}/streaks/${role}`, request.url));
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};