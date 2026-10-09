// frontend/src/utils/adminOnlyPages.ts
//
// Pages only admins may open for now (still in development). Everyone else is shown the
// Blocked page by the proxy and never sees the sidebar link. To open a page to everyone, remove
// its segment here.

export const ADMIN_ONLY_SEGMENTS: readonly string[] = ['minigames', 'achievements'];

/** The admin-only page a URL path belongs to (`/en/minigames/...`), or null. */
export function adminOnlyPageFromPathname(
  pathname: string,
  locales: readonly string[]
): { locale: string; segment: string } | null {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* a malformed escape can't name a page */
  }
  const [locale, segment] = decoded.split('/').filter(Boolean);
  if (!locale || !locales.includes(locale) || !ADMIN_ONLY_SEGMENTS.includes(segment)) return null;
  return { locale, segment };
}
