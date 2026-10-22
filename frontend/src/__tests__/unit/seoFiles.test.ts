// frontend/src/__tests__/unit/seoFiles.test.ts
//
// robots.txt, sitemap.xml, JSON-LD and per-page canonical URLs: what crawlers and link previews see.
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { pageMetadata, siteJsonLd, withSegment } from '@/i18n/metadata';
import { PUBLIC_ROUTES } from '@/i18n/publicRoutes';
import { i18n } from '@/i18n/config';
import enDict from '@/locales/en';
import type { Dictionary } from '@/locales/types';

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe('robots.txt', () => {
  it('opens the site, closes account/admin pages and the API, and names the sitemap', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lemondbd.example';
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const everyone = rules.find((r) => r.userAgent === '*');
    assert.ok(everyone);
    assert.equal(everyone.allow, '/');
    const disallow = everyone.disallow as string[];
    assert.ok(disallow.includes('/api/'));
    assert.ok(disallow.includes('/*/admin'));
    assert.ok(!disallow.includes('/'), 'never disallow the whole site for everyone');
    assert.equal(result.sitemap, 'https://lemondbd.example/sitemap.xml');
  });
});

describe('sitemap.xml', () => {
  it('lists every public page in every locale with its translations', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lemondbd.example';
    const entries = sitemap();
    assert.equal(entries.length, PUBLIC_ROUTES.length * i18n.locales.length);
    const perks = entries.find((e) => e.url === 'https://lemondbd.example/pl/perks');
    assert.equal(perks?.alternates?.languages?.de, 'https://lemondbd.example/de/perks');
    assert.ok(!entries.some((e) => /\/(admin|user)\b/.test(e.url)));
  });

  it('is empty without an absolute site URL', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.deepEqual(sitemap(), []);
  });
});

describe('JSON-LD', () => {
  it('describes the site and cannot break out of its <script>', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lemondbd.example';
    const dict = { ...enDict, app: { ...enDict.app, siteDescription: '</script><script>alert(1)</script>' } } as Dictionary;
    const json = siteJsonLd('en', dict);
    assert.ok(!json.includes('<'));
    const data = JSON.parse(json);
    assert.equal(data['@graph'][0]['@type'], 'WebSite');
    assert.equal(data['@graph'][0].url, 'https://lemondbd.example/en');
    assert.equal(data['@graph'][0].description, '</script><script>alert(1)</script>');
  });
});

describe('page metadata', () => {
  it('a detail page is its own canonical URL, with an og:url and a large preview card', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lemondbd.example';
    const generate = pageMetadata((p) => withSegment('/characters', p.slug), (d) => ({ title: d.app.charactersPageTitle }));
    const meta = await generate({ params: Promise.resolve({ locale: 'pl', slug: 'the trapper' }) });
    assert.equal(meta.alternates?.canonical, '/pl/characters/the%20trapper');
    assert.equal((meta.openGraph as { url?: string }).url, '/pl/characters/the%20trapper');
    assert.equal((meta.twitter as { card?: string }).card, 'summary_large_image');
    const images = (meta.openGraph as { images?: { url: string }[] }).images;
    assert.equal(images?.[0]?.url, '/og-image.png', 'every page carries the preview image (a child openGraph replaces the parent one)');
    assert.ok(meta.description, 'pages without their own description fall back to the site description');
  });
});
