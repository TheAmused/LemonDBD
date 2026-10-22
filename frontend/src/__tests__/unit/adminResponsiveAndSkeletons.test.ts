// frontend/src/__tests__/unit/adminResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { AdminPanelSkeleton } from '@/components/admin/AdminPanelSkeleton';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import en from '@/locales/en';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { renderUsers } from '../helpers/adminFixtures';

describe('Admin Page: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('AdminPanelSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(React.createElement(AdminPanelSkeleton, {}));
    assert.ok(html.includes('<output'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Admin panel skeleton must render DBD Skill Check SVG');
  });

  it('AdminTabContentSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(React.createElement(AdminTabContentSkeleton, { rows: 3 }));
    assert.ok(html.includes('<output'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Admin tab content skeleton must render DBD Skill Check SVG');
  });
});

describe('Admin Page: user directory', () => {
  it('renders a phone card list (sm:hidden) alongside the table (hidden sm:block)', () => {
    const html = renderUsers();
    assert.ok(html.includes('sm:hidden'), 'card list must be present and hidden only at sm+');
    assert.ok(html.includes('overflow-x-auto hidden sm:block'), 'table must be hidden below sm and revealed at sm+');
    assert.equal((html.match(/>lemon_admin</g) || []).length, 2, 'each account appears once per layout');
  });

  it('puts the counts on the filter options only, once each', () => {
    // A closed dropdown renders just its selected option, so select the ones whose counts are checked.
    const html = renderUsers({ role: 'user', standing: 'active' });
    for (const n of ['79', '77']) assert.equal((html.match(new RegExp(`\\(${n}\\)`, 'g')) || []).length, 1, n);
  });

  it('offers moderation only for players other than yourself, the rest in the row menu', () => {
    const html = renderUsers({}, 1);
    assert.equal(html.split(`aria-label="${en.moderation.admin.openButton}"`).length - 1, 2, 'one moderation button per layout, for the player only');
    assert.ok(html.includes('aria-haspopup="menu"'));
    assert.ok(html.includes(en.admin.you));
  });

  it('marks unverified e-mail and two-factor accounts', () => {
    const html = renderUsers();
    assert.ok(html.includes(en.admin.unverifiedBadge));
    assert.ok(html.includes(en.admin.twoFactorBadge));
  });

  it('says it is loading, or that nothing matches, instead of an empty table', () => {
    assert.ok(renderUsers({ users: [], total: 0, loading: true }).includes(en.admin.loading));
    assert.ok(renderUsers({ users: [], total: 0 }).includes(en.admin.noUsers));
  });

  it('icon-only row actions keep a 44px touch target on coarse pointers', () => {
    assert.ok(renderUsers().includes('pointer-coarse:min-h-11'));
  });
});
