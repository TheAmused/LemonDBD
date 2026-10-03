// frontend/src/__tests__/unit/adminOnlyPages.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminOnlyPageFromPathname, ADMIN_ONLY_SEGMENTS } from '@/utils/adminOnlyPages';

const LOCALES = ['en', 'pl', 'de', 'es', 'ja'] as const;

describe('adminOnlyPageFromPathname', () => {
  it('matches the page and everything beneath it', () => {
    assert.deepEqual(adminOnlyPageFromPathname('/en/minigames', LOCALES), { locale: 'en', segment: 'minigames' });
    assert.deepEqual(adminOnlyPageFromPathname('/pl/minigames/guesser/', LOCALES), { locale: 'pl', segment: 'minigames' });
  });

  it('cannot be dodged with encoding or doubled slashes', () => {
    assert.equal(adminOnlyPageFromPathname('/en/%6Dinigames', LOCALES)?.segment, 'minigames');
    assert.equal(adminOnlyPageFromPathname('//en//minigames', LOCALES)?.segment, 'minigames');
  });

  it('leaves every other page and the error pages alone', () => {
    for (const path of ['/en', '/en/perks', '/en/blocked', '/en/forbidden', '/xx/minigames', '/en/%E0%A4%A']) {
      assert.equal(adminOnlyPageFromPathname(path, LOCALES), null, path);
    }
  });

  it('lists minigames as admin-only', () => {
    assert.ok(ADMIN_ONLY_SEGMENTS.includes('minigames'));
  });
});
