// frontend/src/app/sitemap.ts -- /sitemap.xml
import type { MetadataRoute } from 'next';
import { i18n } from '@/i18n/config';
import { languageAlternates, siteUrl } from '@/i18n/metadata';
import { PUBLIC_ROUTES } from '@/i18n/publicRoutes';

/** Every public page in every locale, each listing its translations. Needs NEXT_PUBLIC_SITE_URL
 *  (a sitemap only holds absolute URLs); without it the sitemap is empty. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  const absolute = (path: string) => new URL(path, base).toString();
  return PUBLIC_ROUTES.flatMap((route) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(route)).map(([lang, path]) => [lang, absolute(path)])
    );
    return i18n.locales.map((locale) => ({
      url: absolute(`/${locale}${route}`),
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1 : 0.7,
      alternates: { languages },
    }));
  });
}
