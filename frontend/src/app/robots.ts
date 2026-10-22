// frontend/src/app/robots.ts -- /robots.txt
import type { MetadataRoute } from 'next';
import { siteUrl } from '@/i18n/metadata';
import { PRIVATE_ROUTE_PREFIXES } from '@/i18n/publicRoutes';

/**
 * Everything public is open to search engines. Account and admin pages, and the API, are not.
 * The bulk AI-training crawlers that nginx already refuses (GPTBot, CCBot, Bytespider) are
 * disallowed here too, so the policy is stated where crawlers look for it; assistants fetching
 * a page for a user are not affected (see /llms.txt).
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const privatePaths = ['/api/', ...PRIVATE_ROUTE_PREFIXES.map((prefix) => `/*${prefix}`)];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: privatePaths },
      { userAgent: ['GPTBot', 'CCBot', 'Bytespider'], disallow: '/' },
    ],
    ...(base ? { sitemap: new URL('/sitemap.xml', base).toString(), host: base.origin } : {}),
  };
}
