// frontend/src/__tests__/unit/settingsPage.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_BACKGROUND_EFFECTS } from '@/components/layout/backgroundEffects';
import { ROUTE_SHELLS } from '@/components/layout/shellRoutes';
import fs from 'node:fs';
import path from 'node:path';

describe('Settings page route compliance', () => {
  it('has an entry in ROUTE_BACKGROUND_EFFECTS', () => {
    const listed = new Set(ROUTE_BACKGROUND_EFFECTS.map((r) => r.prefix.join('/')));
    assert.ok(listed.has('settings'), '/settings must have ROUTE_BACKGROUND_EFFECTS entry');
  });

  it('has an entry in ROUTE_SHELLS', () => {
    const listed = new Set(ROUTE_SHELLS.map((r) => r.prefix.join('/')));
    assert.ok(listed.has('settings'), '/settings must have ROUTE_SHELLS entry');
  });

  it('Sidebar contains navigation link to settings', () => {
    const sidebarSrc = fs.readFileSync(path.resolve(__dirname, '../../components/Sidebar.tsx'), 'utf8');
    assert.ok(sidebarSrc.includes('/settings'), 'Sidebar must link to /settings');
  });
});
