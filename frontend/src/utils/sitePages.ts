// frontend/src/utils/sitePages.ts
//
// The page kill switch's view of the site. Which pages exist comes from the route folders
// (generated into src/generated/, see scripts/generate-site-pages.mjs); nothing here is a
// hand-kept list. A page is switchable by default: any first URL segment that is not reserved
// can be switched off, even one the registry hasn't been regenerated for yet.

import { RESERVED_SEGMENTS, SITE_PAGE_IDS } from '@/generated/sitePages.generated';

export { RESERVED_SEGMENTS, SITE_PAGE_IDS };

/** A page known to the registry (discovered from a route folder). */
export type SitePageId = (typeof SITE_PAGE_IDS)[number];

/** A page id as stored/sent: any switchable slug (the backend accepts the same shape). */
export type PageSlug = string;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;

export function isSitePageId(value: string | null | undefined): value is SitePageId {
  return !!value && (SITE_PAGE_IDS as readonly string[]).includes(value);
}

/** True for a segment that may be switched off: a plain slug that is not reserved. */
export function isSwitchableSegment(segment: string | undefined): segment is PageSlug {
  return !!segment && SLUG_RE.test(segment) && !(RESERVED_SEGMENTS as readonly string[]).includes(segment);
}

/** What `GET /api/v1/site/pages` returns. */
export interface SitePagesStatus {
  disabled: PageSlug[];
  viewer_is_admin: boolean;
}

/**
 * The switchable page a URL path belongs to, or null. `/en/perks`, `/en/perks/` and
 * `/en/perks/anything` are all the "perks" page; the home page, the profile, the admin panel,
 * the privacy policy and the error pages can never be switched off.
 */
export function sitePageFromPathname(pathname: string, locales: readonly string[]): { locale: string; page: PageSlug } | null {
  // Next routes on the decoded path, so decode first: `/en/%70erks` is the perks page too.
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* malformed escapes can't match a page anyway */
  }
  const [locale, segment] = decoded.split('/').filter(Boolean);
  if (!locale || !locales.includes(locale) || !isSwitchableSegment(segment)) return null;
  return { locale, page: segment };
}

/** Narrows an untrusted JSON body to a SitePagesStatus (malformed ids are dropped). */
export function parseSitePagesStatus(raw: unknown): SitePagesStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as { disabled?: unknown; viewer_is_admin?: unknown };
  if (!Array.isArray(body.disabled)) return null;
  return {
    disabled: body.disabled.filter((id): id is PageSlug => typeof id === 'string' && SLUG_RE.test(id)),
    viewer_is_admin: body.viewer_is_admin === true,
  };
}
