// frontend/src/__tests__/unit/settings/settingsPage.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_BACKGROUND_EFFECTS } from '@/components/layout/backgroundEffects';
import { ROUTE_SHELLS, shellForPathname } from '@/components/layout/shellRoutes';

describe('Settings page route compliance', () => {
  it('has an entry in ROUTE_BACKGROUND_EFFECTS', () => {
    const listed = new Set(ROUTE_BACKGROUND_EFFECTS.map((r) => r.prefix.join('/')));
    assert.ok(listed.has('settings'), '/settings must have ROUTE_BACKGROUND_EFFECTS entry');
  });

  it('has an entry in ROUTE_SHELLS and shell is listed', () => {
    const listed = new Set(ROUTE_SHELLS.map((r) => r.prefix.join('/')));
    assert.ok(listed.has('settings'), '/settings must have ROUTE_SHELLS entry');
    const match = shellForPathname('/en/settings');
    assert.equal(match.listed, true);
  });

});
