// frontend/src/__tests__/unit/settingsPage.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_BACKGROUND_EFFECTS } from '@/components/layout/backgroundEffects';
import { ROUTE_SHELLS, shellForPathname } from '@/components/layout/shellRoutes';
import fs from 'node:fs';
import path from 'node:path';

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

  it('Sidebar contains navigation link to settings', () => {
    const sidebarSrc = fs.readFileSync(path.resolve(__dirname, '../../components/Sidebar.tsx'), 'utf8');
    assert.ok(sidebarSrc.includes('/settings'), 'Sidebar must link to /settings');
  });

  it('all 5 locales provide settings dictionary', async () => {
    for (const loc of ['en', 'de', 'es', 'ja', 'pl']) {
      const dictModule = await import(`@/locales/${loc}/settings`);
      const settings = dictModule.default ?? dictModule.settings;
      assert.ok(settings, `locale ${loc} must export settings`);
      assert.ok(settings.title, `locale ${loc} must have settings.title`);
      assert.ok(settings.audio, `locale ${loc} must have settings.audio`);
      assert.ok(settings.visuals, `locale ${loc} must have settings.visuals`);
      assert.ok(settings.content, `locale ${loc} must have settings.content`);
      assert.ok(settings.campfire, `locale ${loc} must have settings.campfire`);
    }
  });
});
