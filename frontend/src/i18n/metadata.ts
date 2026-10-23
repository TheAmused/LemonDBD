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

/** The link-preview image (public/og-image.png), 1200x630 as Open Graph recommends. */
const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 } as const;

export interface PageMetadataFields {
  title: string;
  /** Falls back to the site description, so every page has one (and Open Graph gets it too). */
  description?: string;
}

/** A page's route params: the locale plus whatever dynamic segments the route has. */
export type RouteParams = { locale: string } & Record<string, string | string[] | undefined>;

/** `/characters/the-trapper` from `('/characters', slug)`: one URL-safe path segment appended. */
export function withSegment(base: string, segment: string | string[] | undefined): string {
  const value = Array.isArray(segment) ? segment.join('/') : segment;
  return value ? `${base}/${encodeURIComponent(value)}` : base;
}

/**
 * @param path    route path without the locale, '' for home, e.g. '/perks'; a function of the
 *                route params for dynamic routes, so a detail page is its own canonical URL
 *                (pointing it at the listing page told search engines to drop the detail page)
 * @param noindex keep the page out of search results (admin, auth, onboarding)
 */
export function pageMetadata(
  path: string | ((params: RouteParams) => string),
  pick: (dict: Dictionary) => PageMetadataFields,
  options: { noindex?: boolean } = {}
) {
  return async ({ params }: { params: Promise<RouteParams> }): Promise<Metadata> => {
    const routeParams = await params;
    const locale = resolveLocale(routeParams.locale);
    const dict = await getDictionary(locale);
    const { title, description = dict.app.siteDescription } = pick(dict);
    const routePath = typeof path === 'function' ? path(routeParams) : path;
    const hasBase = siteUrl() !== null;
    const indexable = hasBase && !options.noindex;
    // Set on every page: a page's own `openGraph` replaces its parent's, image included. Needs the
    // site URL, since a preview image must be an absolute URL.
    const image = hasBase ? { url: OG_IMAGE.path, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: dict.app.title } : null;

    return {
      // Dictionary titles already carry the "LemonDBD - " prefix, so skip the layout template.
      title: { absolute: title },
      description,
      openGraph: {
        title,
        description,
        siteName: dict.app.title,
        ...(image ? { images: [image] } : {}),
        type: 'website',
        locale: localeMeta[locale].bcp47.replace('-', '_'),
        ...(indexable ? { url: `/${locale}${routePath}` } : {}),
      },
      twitter: { card: 'summary_large_image', title, description, ...(image ? { images: [image.url] } : {}) },
      ...(options.noindex ? { robots: { index: false, follow: false } } : {}),
      ...(indexable
        ? { alternates: { canonical: `/${locale}${routePath}`, languages: languageAlternates(routePath) } }
        : {}),
    };
  };
}

/** The schema.org WebSite / Organization description of the site, serialized for a JSON-LD
 *  <script>. URLs only when NEXT_PUBLIC_SITE_URL is set (JSON-LD wants absolute ones). */
export function siteJsonLd(locale: Locale, dict: Dictionary): string {
  const base = siteUrl();
  const origin = base ? base.origin : null;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: dict.app.title,
        description: dict.app.siteDescription,
        inLanguage: localeMeta[locale].bcp47,
        ...(origin ? { url: `${origin}/${locale}` } : {}),
      },
      {
        '@type': 'Organization',
        name: dict.app.title,
        ...(origin ? { url: origin, logo: `${origin}/icon.png` } : {}),
      },
    ],
  };
  // `<` escaped so the JSON can never close the <script> element it is embedded in.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
