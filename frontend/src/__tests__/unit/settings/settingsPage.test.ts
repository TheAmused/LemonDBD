// frontend/src/__tests__/unit/settings/settingsPage.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_BACKGROUND_EFFECTS } from '@/components/layout/backgroundEffects';
import { ROUTE_SHELLS, shellForPathname } from '@/components/layout/shellRoutes';

import fs from 'node:fs';
import path from 'node:path';
import en from '@/locales/en/settings';

describe('Settings page layout', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../app/[locale]/settings/SettingsClient.tsx'), 'utf8');

  it('is one list of settings, not split into titled sections', () => {
    assert.equal((source.match(/<Surface\b/g) ?? []).length, 1);
    assert.ok(!/section(?:Global|Minigames)/.test(source));
    assert.ok(!Object.keys(en).some((key) => key.startsWith('section')));
  });

  it('has a GIFs switch wired to the gifs preference', () => {
    assert.ok(source.includes('preferences.gifs'));
    assert.ok(source.includes('updatePreferences({ gifs: checked })'));
    assert.ok(en.gifs && en.gifsDesc);
  });
});

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
