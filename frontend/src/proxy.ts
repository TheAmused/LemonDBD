// frontend/src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n, type Locale } from '@/i18n/config';
import { parseSitePagesStatus, sitePageFromPathname, type SitePagesStatus } from '@/utils/sitePages';

/**
 * Asks the backend which pages are switched off and whether this visitor is an admin (their
 * session cookie is forwarded). Returns null when the backend can't answer: the page then
 * loads normally, while the API guard keeps protecting the page's own endpoints.
 */
/** Where the Next server reaches the backend. NEXT_PUBLIC_API_URL is the browser-facing address
 * (https://localhost inside a container points back at the frontend itself), so it is not used. */
const BACKEND_URL = (process.env.INTERNAL_API_URL || 'http://backend:5000').replace(/\/+$/, '');

async function fetchSitePagesStatus(cookie: string): Promise<SitePagesStatus | null> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/site/pages`, {
            headers: { cookie },
            cache: 'no-store',
            signal: AbortSignal.timeout(1500),
        });
        if (res.ok) return parseSitePagesStatus(await res.json());
        console.warn(`[page-switches] backend answered ${res.status}; pages are not being checked`);
        return null;
    } catch (err) {
        console.warn('[page-switches] backend unreachable; pages are not being checked', err);
        return null;
    }
}

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

/**
 * The switched-off list lives in memory so the normal case (page is on) costs no backend call.
 * It is refreshed in the background at most every PAGES_TTL_MS and never makes a request wait,
 * except the very first one after a cold start. The visitor-specific admin check only happens
 * for the rare request to a page that is switched off.
 */
const PAGES_TTL_MS = 5000;
let pagesCache: { at: number; disabled: readonly string[] } | null = null;
let pagesRefresh: Promise<void> | null = null;
let pagesFailedAt = 0;

function refreshPagesCache(): Promise<void> {
    pagesRefresh ??= fetchSitePagesStatus('')
        .then((status) => {
            if (status) {
                pagesCache = { at: Date.now(), disabled: status.disabled };
                pagesFailedAt = 0;
            } else {
                pagesFailedAt = Date.now();
            }
        })
        .finally(() => {
            pagesRefresh = null;
        });
    return pagesRefresh;
}

async function cachedDisabledPages(): Promise<readonly string[]> {
    if (!pagesCache) {
        // Cold start: wait once. If the backend is down, don't make every request wait for it.
        if (Date.now() - pagesFailedAt > PAGES_TTL_MS) await refreshPagesCache();
    } else if (Date.now() - pagesCache.at > PAGES_TTL_MS) void refreshPagesCache();
    return pagesCache?.disabled ?? [];
}

export async function proxy(request: NextRequest) {
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

    // Page kill switch: a page an admin switched off is served as the "Blocked" page to everyone
    // else, whatever way they reached it (link, typed URL, bookmark, client-side navigation).
    const target = sitePageFromPathname(pathname, i18n.locales);
    if (target) {
        if (!(await cachedDisabledPages()).includes(target.page)) return;
        // Switched off: now (and only now) ask who is looking, with a fresh answer.
        const status = await fetchSitePagesStatus(request.headers.get('cookie') ?? '');
        if (status && !status.viewer_is_admin && status.disabled.includes(target.page)) {
            const response = NextResponse.rewrite(
                new URL(`/${target.locale}/blocked?page=${target.page}`, request.url)
            );
            response.headers.set('X-Robots-Tag', 'noindex, nofollow');
            response.headers.set('Cache-Control', 'no-store');
            return response;
        }
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};