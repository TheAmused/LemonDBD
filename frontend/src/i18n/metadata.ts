// frontend/src/i18n/metadata.ts
//
// Server-side page metadata (title, description, canonical, hreflang, Open Graph) built
// from the locale dictionary. Route layouts export it directly:
//
//   export const generateMetadata = pageMetadata('/perks', (d) => ({ title: d.app.perksVaultPageTitle }));
//
// so titles are in the HTML crawlers and link previews see, instead of being set by a
// client effect after hydration.
//
// canonical + hreflang need an absolute site URL: set NEXT_PUBLIC_SITE_URL
// (e.g. https://lemondbd.example) at build time. Without it they are omitted rather
// than emitting localhost URLs.

import type { Metadata } from 'next';
import type { Dictionary } from '@/locales/types';
import { i18n, localeMeta, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

export function siteUrl(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function resolveLocale(raw: string): Locale {
  return ((i18n.locales as readonly string[]).includes(raw) ? raw : i18n.defaultLocale) as Locale;
}

/** `{ en: '/en/perks', pl: '/pl/perks', ..., 'x-default': '/en/perks' }` */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of i18n.locales) languages[l] = `/${l}${path}`;
  languages['x-default'] = `/${i18n.defaultLocale}${path}`;
  return languages;
}

export interface PageMetadataFields {
  title: string;
  description?: string;
}

/**
 * @param path    route path without the locale, '' for home, e.g. '/perks'
 * @param noindex keep the page out of search results (admin, auth, onboarding)
 */
export function pageMetadata(
  path: string,
  pick: (dict: Dictionary) => PageMetadataFields,
  options: { noindex?: boolean } = {}
) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const locale = resolveLocale((await params).locale);
    const { title, description } = pick(await getDictionary(locale));
    const hasBase = siteUrl() !== null;

    return {
      // Dictionary titles already carry the "LemonDBD - " prefix, so skip the layout template.
      title: { absolute: title },
      ...(description ? { description } : {}),
      openGraph: {
        title,
        ...(description ? { description } : {}),
        type: 'website',
        locale: localeMeta[locale].bcp47.replace('-', '_'),
      },
      twitter: { card: 'summary', title, ...(description ? { description } : {}) },
      ...(options.noindex ? { robots: { index: false, follow: false } } : {}),
      ...(hasBase && !options.noindex
        ? { alternates: { canonical: `/${locale}${path}`, languages: languageAlternates(path) } }
        : {}),
    };
  };
}
