// frontend/src/utils/adminOnlyPages.ts
//
// Pages only admins may open for now (still in development). Everyone else is shown the
// Blocked page by the proxy and never sees the sidebar link. To open a page to everyone, remove
// its segment here.

export const ADMIN_ONLY_SEGMENTS: readonly string[] = ['minigames', 'achievements'];

/**
 * The admin panel itself. The panel's API is admin-only anyway; gating the page on the server too
 * means non-admins are not even served its HTML (they get the Forbidden page).
 */
export const ADMIN_PANEL_SEGMENTS: readonly string[] = ['admin'];

function leadingSegments(pathname: string): [string | undefined, string | undefined] {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* a malformed escape can't name a page */
  }
  const [locale, segment] = decoded.split('/').filter(Boolean);
  return [locale, segment];
}

/** The admin-only page a URL path belongs to (`/en/minigames/...`), or null. */
export function adminOnlyPageFromPathname(
  pathname: string,
  locales: readonly string[]
): { locale: string; segment: string } | null {
  const [locale, segment] = leadingSegments(pathname);
  if (!locale || !segment || !locales.includes(locale) || !ADMIN_ONLY_SEGMENTS.includes(segment)) return null;
  return { locale, segment };
}

/** The locale of an admin-panel URL (`/en/admin`, `/pl/admin/...`), or null. */
export function adminPanelLocaleFromPathname(pathname: string, locales: readonly string[]): string | null {
  const [locale, segment] = leadingSegments(pathname);
  if (!locale || !segment || !locales.includes(locale) || !ADMIN_PANEL_SEGMENTS.includes(segment)) return null;
  return locale;
}
