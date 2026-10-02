// frontend/src/utils/sitePages.ts
//
// The pages an admin can switch off ("page kill switch"). One list, shared by the proxy that
// refuses them, the sidebar that hides them and the admin panel that toggles them.
// Keep SITE_PAGE_IDS in sync with PAGE_IDS in backend/app/utils/site_settings_spec.py.

export const SITE_PAGE_IDS = [
  'perks',
  'randomizer',
  'streaks',
  'minigames',
  'maps',
  'characters',
  'tier-lists',
  'smash-or-pass',
  'achievements',
  'about',
] as const;

export type SitePageId = (typeof SITE_PAGE_IDS)[number];

export function isSitePageId(value: string | null | undefined): value is SitePageId {
  return !!value && (SITE_PAGE_IDS as readonly string[]).includes(value);
}

/** What `GET /api/v1/site/pages` returns. */
export interface SitePagesStatus {
  disabled: SitePageId[];
  viewer_is_admin: boolean;
}

/**
 * The switchable page a URL path belongs to, or null. `/en/perks`, `/en/perks/` and
 * `/en/perks/anything` are all the "perks" page; `/en/user`, `/en/admin`, the home page and
 * the privacy policy can never be switched off.
 */
export function sitePageFromPathname(pathname: string, locales: readonly string[]): { locale: string; page: SitePageId } | null {
  // Next routes on the decoded path, so decode first: `/en/%70erks` is the perks page too.
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* malformed escapes can't match a page anyway */
  }
  const [locale, segment] = decoded.split('/').filter(Boolean);
  if (!locale || !locales.includes(locale) || !isSitePageId(segment)) return null;
  return { locale, page: segment };
}

/** Narrows an untrusted JSON body to a SitePagesStatus (unknown ids are dropped). */
export function parseSitePagesStatus(raw: unknown): SitePagesStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as { disabled?: unknown; viewer_is_admin?: unknown };
  if (!Array.isArray(body.disabled)) return null;
  return {
    disabled: body.disabled.filter((id): id is SitePageId => typeof id === 'string' && isSitePageId(id)),
    viewer_is_admin: body.viewer_is_admin === true,
  };
}
