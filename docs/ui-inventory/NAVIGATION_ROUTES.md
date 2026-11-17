# Navigation Routes (frontend/src/app)

Sources: `frontend/src/app/**`, `src/proxy.ts`, `src/i18n/config.ts`, `src/i18n/publicRoutes.ts`, `src/components/Sidebar.tsx`, `src/components/admin/adminLinks.ts`, `src/utils/adminOnlyPages.ts`.

All paths below are relative to `frontend/src/app/`. `[locale]/` = `app/[locale]/`.

## 1. Locale handling

- `i18n/config.ts`: `defaultLocale = 'en'`, `locales = ['en','es','pl','de','ja']`. `localeMeta` holds the BCP-47 / Whisper codes for each locale.
- `proxy.ts` (Next 16 proxy, matcher `/((?!api|_next/static|_next/image|favicon.ico).*)`) runs these steps in order:
  1. **Admin gating (before the static-file shortcut):**
     - `/{locale}/minigames…` and `/{locale}/achievements…` (`ADMIN_ONLY_SEGMENTS`) are rewritten to `/{locale}/blocked` unless the viewer is an admin. The rewrite is `noindex` and `no-store`.
     - `/{locale}/admin…` is rewritten to `/{locale}/admin-entry` (the admin sign-in) for non-admins.
     - Admin status comes from `GET {INTERNAL_API_URL}/api/v1/auth/me` with a 1.5s timeout. Any failure counts as "not admin".
  2. **Skip** `/_next`, `/api` and any path containing `.`.
  3. **Missing locale prefix** gives a redirect to `/{locale}{path}`. The locale is the signed-in user's `preferred_language`, then the `Accept-Language` header, then `en`.
  4. **Maintenance:** if the backend says the visitor is blocked, the proxy rewrites to `/{locale}/maintenance` with status 503 and a `Retry-After` header. The admin panel and `/maintenance` are exempt.
  5. **`/{locale}/streaks`** redirects to `/{locale}/streaks/{role}`. The role comes from the cookie `lemon_dbd_streaks_last_role` and defaults to survivor via `resolveStreakRole`.
- `i18n/publicRoutes.ts`: `PUBLIC_ROUTES` (used by sitemap and llms.txt) are `''`, perks, characters, maps, randomizer, minigames, smash-or-pass, streaks, tier-lists, about, rules, privacy-policy, terms-of-service. `PRIVATE_ROUTE_PREFIXES` (robots) are admin, user, welcome, reset-password, blocked, forbidden, maintenance.

## 2. Route table

Access legend:
- **public**: anyone can open it.
- **auth (client)**: the page is public HTML, and the client component handles the signed-in state (AuthContext / auth modal). The proxy does not enforce it.
- **admin (proxy)**: the proxy gates it, and non-admins see `blocked` or `admin-entry`.

The root layout is `[locale]/layout.tsx`, with `[locale]/error.tsx` and `[locale]/not-found.tsx` as boundaries for every route under it. "Layout/loading" below lists only the extras.

| URL pattern | Page file | Layout / loading | Access | Sidebar label |
|---|---|---|---|---|
| `/{locale}` | `[locale]/page.tsx` | – | public | Logo links home (no label) |
| `/{locale}/about` | `[locale]/about/page.tsx` | – | public | About |
| `/{locale}/achievements` | `[locale]/achievements/page.tsx` | `achievements/loading.tsx` | admin (proxy) | Trophies (`sidebar.trophies`, admins only) |
| `/{locale}/admin` | `[locale]/admin/page.tsx` | `admin/loading.tsx` | admin (proxy) | Admin → Control Center (`sidebar.adminControlCenter`) |
| `/{locale}/admin-entry` | `[locale]/admin-entry/page.tsx` | – | public (admin sign-in; served in place of `/admin`) | – |
| `/{locale}/blocked` | `[locale]/blocked/page.tsx` | – | public | – |
| `/{locale}/characters` | `[locale]/characters/page.tsx` | `characters/loading.tsx` | public | Database → Characters |
| `/{locale}/characters/{slug}` | `[locale]/characters/[slug]/page.tsx` | `characters/[slug]/loading.tsx` | public | (under Characters) |
| `/{locale}/forbidden` | `[locale]/forbidden/page.tsx` | – | public | – |
| `/{locale}/maintenance` | `[locale]/maintenance/page.tsx` | – | public (503 via proxy) | – |
| `/{locale}/maps` | `[locale]/maps/page.tsx` | `maps/loading.tsx` | public | Map Callouts |
| `/{locale}/minigames` | `[locale]/minigames/page.tsx` | `minigames/loading.tsx` | admin (proxy) | Extras → Minigames (admins only) |
| `/{locale}/minigames/creator` | `[locale]/minigames/creator/page.tsx` | – | admin (proxy) | (under Minigames) |
| `/{locale}/minigames/idle` | `[locale]/minigames/idle/page.tsx` | – | admin (proxy) | (under Minigames) |
| `/{locale}/minigames/play` | `[locale]/minigames/play/page.tsx` | – | admin (proxy) | (under Minigames) |
| `/{locale}/perks` | `[locale]/perks/page.tsx` | `perks/loading.tsx` | public | Database → Perks |
| `/{locale}/privacy-policy` | `[locale]/privacy-policy/page.tsx` | – | public | – |
| `/{locale}/randomizer` | `[locale]/randomizer/page.tsx` | `randomizer/loading.tsx` | public | Generator |
| `/{locale}/reset-password` | `[locale]/reset-password/page.tsx` | – | public (token link) | – |
| `/{locale}/rules` | `[locale]/rules/page.tsx` | – | public | – |
| `/{locale}/settings` | `[locale]/settings/page.tsx` | `settings/loading.tsx` | auth (client) | Settings |
| `/{locale}/smash-or-pass` | `[locale]/smash-or-pass/page.tsx` | `smash-or-pass/loading.tsx` | public | Extras → Smash or Pass |
| `/{locale}/smash-or-pass/create` | `[locale]/smash-or-pass/create/page.tsx` | `smash-or-pass/create/loading.tsx` | auth (client) | (under Smash or Pass) |
| `/{locale}/streaks` | `[locale]/streaks/page.tsx` | `streaks/layout.tsx`, `streaks/loading.tsx` | public (the proxy redirects it to `/streaks/{role}`) | Challenges |
| `/{locale}/streaks/{role}` | `[locale]/streaks/[role]/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/streaks/{role}/gauntlet-streak` | `[locale]/streaks/[role]/gauntlet-streak/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/streaks/{role}/id-please` | `[locale]/streaks/[role]/id-please/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/streaks/killer/chaos-streak` | `[locale]/streaks/killer/chaos-streak/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/streaks/killer/history-streak` | `[locale]/streaks/killer/history-streak/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/streaks/killer/page-streak` | `[locale]/streaks/killer/page-streak/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/streaks/killer/page-streak/{killer}` | `[locale]/streaks/killer/page-streak/[killer]/page.tsx` | `streaks/layout.tsx` | public | (under Challenges) |
| `/{locale}/terms-of-service` | `[locale]/terms-of-service/page.tsx` | – | public | – |
| `/{locale}/tier-lists` | `[locale]/tier-lists/page.tsx` | `tier-lists/loading.tsx` | public | Extras → Tier Lists |
| `/{locale}/tier-lists/new` | `[locale]/tier-lists/new/page.tsx` | – | auth (client) | (under Tier Lists) |
| `/{locale}/tier-lists/custom/{id}` | `[locale]/tier-lists/custom/[id]/page.tsx` | – | public (shared link) | (under Tier Lists) |
| `/{locale}/tier-lists/{slug}` | `[locale]/tier-lists/[slug]/page.tsx` | – | public | (under Tier Lists) |
| `/{locale}/user` | `[locale]/user/page.tsx` | `user/loading.tsx` | auth (client) | User section at the bottom of the sidebar (`SidebarUserSection`) |
| `/{locale}/welcome` | `[locale]/welcome/page.tsx` | `welcome/loading.tsx` | auth (client, onboarding) | – |
| `/{locale}/{...rest}` | `[locale]/[...rest]/page.tsx` | – | public (calls `notFound()`) | – |

### Non-page routes

| URL | File | Notes |
|---|---|---|
| `/api/healthz` | `api/healthz/route.ts` | Health check. `/api` is skipped by the proxy. |
| `/api/umami-config` | `api/umami-config/route.ts` | Analytics config for the client. |
| `/llms.txt` | `llms.txt/route.ts` | `force-static`, English, built from `PUBLIC_ROUTES`. No locale prefix: the proxy skips it because it contains `.`. |
| `/robots.txt`, `/sitemap.xml` | `robots.ts`, `sitemap.ts` | Metadata routes. |

## 3. Dynamic params

- `[locale]`: one of `en|es|pl|de|ja`. A path with any other first segment gets the locale prefix added by the proxy, so `/foo` becomes `/en/foo` and a legacy `/perks` becomes `/{locale}/perks`.
- `[slug]` under `characters`: the character slug.
- `[slug]` under `tier-lists`: a built-in tier list slug. `new` and `custom/[id]` are static or more specific and win over it.
- `custom/[id]`: a user-made tier list id. It is URL-decoded, and `notFound()` is called if decoding fails.
- `streaks/[role]`: `killer | survivor | challenge` (`VALID_ROLES`), otherwise `notFound()`. `[role]/gauntlet-streak` and `[role]/id-please` reuse it. `streaks/killer/*` are static siblings that win over `[role]`.
- `streaks/killer/page-streak/[killer]`: a specific killer's page-streak.
- `[...rest]`: a catch-all under a valid locale. It calls `notFound()` so the localized `not-found.tsx` is rendered.

## 4. Special pages / files

- `app/global-error.tsx`: root error boundary (catches layout errors).
- `[locale]/error.tsx`, `[locale]/not-found.tsx`: localized error and 404 pages (copy comes from `i18n/errorPageCopy.ts`).
- `blocked`: "still in development" page for the admin-only pages.
- `admin-entry`: admin sign-in, served in place of `/admin`.
- `forbidden`: forbidden page.
- `maintenance`: maintenance page, 503.
- `streaks/layout.tsx`: the role tabs.
- Loading skeletons exist for: achievements, admin, characters, characters/[slug], maps, minigames, perks, randomizer, settings, smash-or-pass, smash-or-pass/create, streaks, tier-lists, user, welcome.

## 5. Sidebar structure (`components/Sidebar.tsx`)

`navEntries` (hrefs are `/${currentLocale}/${segment}`):

1. Challenges → `/streaks` (prefetch off, because of the cookie redirect)
2. Map Callouts → `/maps`
3. Generator → `/randomizer`
4. **Database** (group)
   - Perks → `/perks`
   - Characters → `/characters`
5. **Extras** (group)
   - Tier Lists → `/tier-lists`
   - Smash or Pass → `/smash-or-pass`
   - Minigames → `/minigames` (hidden for non-admins)
6. Trophies → `/achievements` (hidden for non-admins)
7. Settings → `/settings`
8. About → `/about`
9. **Admin** group (`groupAdmin`, appended only when `isAdmin`): Control Center → `/admin`

- Active state: `pathname.startsWith(href)`.
- Visibility: `visibleNavEntries` drops items for which `adminOnlyPageFromPathname` matches (`ADMIN_ONLY_SEGMENTS = ['minigames','achievements']`) unless `isAdmin`. A group left empty disappears.
- Also in the sidebar: the logo links to `/{locale}`, `SidebarUserSection` (login/user, language select via `setPreferredLanguage`, and the bard-insults, bug-report and buy-coffee modals), and `AuthModal`. A mobile drawer renders the same content.
- Labels come from the `dict.sidebar.*` dictionary keys, so they are localized.
- `components/admin/adminLinks.ts` is not sidebar navigation. It builds external admin-dashboard URLs: `analyticsUrl()` (Umami) from `NEXT_PUBLIC_UMAMI_URL`, or the current host plus the default port from `constants/externalTools`.

## 6. Per-page inventories

Per-page detail files (`docs/ui-inventory/pages/<group>.md`):

- [public-content.md](pages/public-content.md): home, about, rules, privacy-policy, terms-of-service
- [database.md](pages/database.md): perks, characters, maps, randomizer
- [streaks.md](pages/streaks.md): streaks and its sub-games
- [extras.md](pages/extras.md): tier-lists, smash-or-pass, minigames, achievements
- [account.md](pages/account.md): user, settings, welcome, reset-password
- [admin.md](pages/admin.md): admin, admin-entry, blocked, forbidden, maintenance
