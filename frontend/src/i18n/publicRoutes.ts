// frontend/src/i18n/publicRoutes.ts
//
// The pages a search engine (or an AI assistant) should know about, without the locale prefix.
// Used by app/sitemap.ts and app/llms.txt; account, admin and editor pages are left out.
export const PUBLIC_ROUTES = [
  '',
  '/perks',
  '/characters',
  '/maps',
  '/randomizer',
  '/minigames',
  '/smash-or-pass',
  '/streaks',
  '/tier-lists',
  '/about',
  '/rules',
  '/privacy-policy',
  '/terms-of-service',
] as const;

/** Paths crawlers are asked to skip (every locale), see app/robots.ts. */
export const PRIVATE_ROUTE_PREFIXES = ['/admin', '/user', '/welcome', '/reset-password', '/blocked', '/forbidden'] as const;
