# 08 – API & non-visual routes

No visible UI. All paths relative to `frontend/src`. Locales: en (default), es, pl, de, ja (`i18n/config.ts`).

## /api/healthz
- **Page & files:** `app/api/healthz/route.ts` (GET, `force-dynamic`).
- **Behavior:** returns `{status:"ok"}`, `Cache-Control: no-store`. Container liveness probe only (127.0.0.1:3000); nginx routes public `/api/` to backend, so not externally reachable.
- **Modes / states:** single state. **Modals:** none.

## /api/umami-config
- **Page & files:** `app/api/umami-config/route.ts` (GET, `force-dynamic`); uses `utils/logger`.
- **Behavior:** returns `{websiteId, url}` (no-store) for the client analytics script.
  - Blank `NEXT_PUBLIC_UMAMI_URL` (tracking disabled) → `{websiteId:"", url:""}`.
  - Otherwise `getWebsiteId()`: in-memory cache; de-duped in-flight provisioning. Logs in to Umami (`UMAMI_ADMIN_*` env, default admin/umami), lists sites, reuses a match on domain/name (`UMAMI_SITE_NAME`, `UMAMI_SITE_DOMAIN`), else creates the website. Handles v1/v2 response shapes.
  - Failure → warns, not cached, returns `websiteId:""` (retried next request).
- **Modals:** none.

## /llms.txt
- **Page & files:** `app/llms.txt/route.ts` (`force-static`, `text/plain; charset=utf-8`).
- **Behavior:** English markdown map for AI assistants. Title and description come from the en dictionary (`app.title`, `app.siteDescription`). Notes the 5 locales. "Tools" links: perks, characters, maps, randomizer, streaks (challenges), minigames, tier-lists, smash-or-pass. "About" links: about, rules, privacy-policy, terms-of-service. Links are `/en/...`, absolute if `siteUrl()` is set.

## /robots.txt (`robots.ts`)
- **Page & files:** `app/robots.ts`; `i18n/publicRoutes.ts` (`PRIVATE_ROUTE_PREFIXES`); `i18n/metadata.ts` (`siteUrl`).
- **Behavior:** `*` allow `/`, disallow `/api/` and `/*/admin|user|welcome|reset-password|blocked|forbidden|maintenance` (`/*` + prefix). GPTBot, CCBot and Bytespider are disallowed on `/`. Adds `sitemap` (`/sitemap.xml`) and `host` only when the site URL is configured.

## /sitemap.xml (`sitemap.ts`)
- **Page & files:** `app/sitemap.ts`; `i18n/publicRoutes.ts` (`PUBLIC_ROUTES`); `i18n/metadata.ts` (`languageAlternates`, `siteUrl`).
- **Behavior:** needs `NEXT_PUBLIC_SITE_URL`, otherwise returns an empty sitemap. For each public route × 5 locales it emits an absolute URL with hreflang `alternates.languages`. Home is daily with priority 1; the rest are weekly with priority 0.7.
- **Public routes:** home, /perks, /characters, /maps, /randomizer, /minigames, /smash-or-pass, /streaks, /tier-lists, /about, /rules, /privacy-policy, /terms-of-service.

## proxy.ts (Next proxy/middleware)
- **Page & files:** `proxy.ts`; helpers `utils/adminOnlyPages.ts`, `utils/maintenanceProxy.ts`, `utils/streakRole.ts`, `i18n/config.ts`. Matcher: everything except `api`, `_next/static`, `_next/image`, `favicon.ico`.
- **Order of behavior:**
  1. **Admin gating** (runs first, even for paths containing a dot).
     - `ADMIN_ONLY_SEGMENTS` = `minigames`, `achievements`. A non-admin is rewritten to `/{locale}/blocked`.
     - Admin panel `/{locale}/admin...`: a non-admin is rewritten to `/{locale}/admin-entry` (admin sign-in), before the maintenance check so admins can always get in.
     - Admin check: no cookie → not admin. Otherwise `GET {INTERNAL_API_URL|http://backend:5000}/api/v1/auth/me` (1.5s timeout); only `user.role==='admin'` passes. Errors → not admin (fail closed).
     - Rewrites send `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`.
  2. **Skip** `/_next`, `/api`, and any path with `.` (static files).
  3. **Locale redirect:** a path without a locale prefix redirects to `/{locale}{path}`. The locale is the signed-in user's `preferred_language` (via `/auth/me`) if valid, else the Accept-Language header (q-weighted, primary subtag), else `en`.
  4. **Maintenance:** skipped for admin panel and `/{locale}/maintenance`. `checkMaintenance` calls backend `/api/v1/site-config/maintenance` (cookie + `x-real-ip`; 1.5s timeout; "off" answer cached a few seconds). If blocked, the page is rewritten to `/{locale}/maintenance` with status 503, quiet headers, and `Retry-After` from the `until` time.
  5. **Streaks role redirect:** bare `/{locale}/streaks[/]` redirects to `/{locale}/streaks/{role}` (no-store). The role comes from cookie `lemon_dbd_streaks_last_role`: survivor, challenge, or killer (default). This avoids the tabs painting the wrong role before a client redirect.
- **Rewrite target pages (visible, covered elsewhere):** blocked, admin-entry, maintenance.
