// frontend/src/__tests__/unit/sitePages.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSitePageId, parseSitePagesStatus, sitePageFromPathname, SITE_PAGE_IDS } from '@/utils/sitePages';

const LOCALES = ['en', 'pl', 'de', 'es', 'ja'] as const;

describe('sitePageFromPathname', () => {
  it('maps a page and everything beneath it', () => {
    assert.deepEqual(sitePageFromPathname('/en/perks', LOCALES), { locale: 'en', page: 'perks' });
    assert.deepEqual(sitePageFromPathname('/pl/perks/', LOCALES), { locale: 'pl', page: 'perks' });
    assert.deepEqual(sitePageFromPathname('/de/tier-lists/abc/edit', LOCALES), { locale: 'de', page: 'tier-lists' });
  });

  it('never matches the home page, profile, admin, privacy or the error pages', () => {
    for (const path of ['/en', '/en/', '/en/user', '/en/admin', '/en/privacy-policy', '/en/blocked', '/en/forbidden']) {
      assert.equal(sitePageFromPathname(path, LOCALES), null, path);
    }
  });

  it('cannot be dodged with encoding or doubled slashes', () => {
    assert.equal(sitePageFromPathname('/en/%70erks', LOCALES)?.page, 'perks');
    assert.equal(sitePageFromPathname('//en//perks', LOCALES)?.page, 'perks');
  });

  it('ignores unknown locales and malformed escapes', () => {
    assert.equal(sitePageFromPathname('/xx/perks', LOCALES), null);
    assert.equal(sitePageFromPathname('/en/%E0%A4%A', LOCALES), null);
  });

  it('covers every switchable page', () => {
    for (const id of SITE_PAGE_IDS) assert.equal(sitePageFromPathname(`/en/${id}`, LOCALES)?.page, id);
  });
});

describe('parseSitePagesStatus', () => {
  it('keeps known ids only and reads the admin flag strictly', () => {
    assert.deepEqual(parseSitePagesStatus({ disabled: ['maps', 'nope', 3], viewer_is_admin: true }), {
      disabled: ['maps'],
      viewer_is_admin: true,
    });
    assert.equal(parseSitePagesStatus({ disabled: [], viewer_is_admin: 'true' })?.viewer_is_admin, false);
  });

  it('rejects anything that is not a status object', () => {
    assert.equal(parseSitePagesStatus(null), null);
    assert.equal(parseSitePagesStatus({ disabled: 'maps' }), null);
    assert.equal(isSitePageId('maps'), true);
    assert.equal(isSitePageId('admin'), false);
  });
});
