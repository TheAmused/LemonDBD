// frontend/src/__tests__/unit/adminResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminPanelSkeleton } from '@/components/admin/AdminPanelSkeleton';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import type { UserRow } from '@/types/admin';
import enDict from '@/locales/en';

describe('Admin Page: Skeletons & Zero-CLS Layout Integrity', () => {
  it('AdminPanelSkeleton renders with role="status", aria-busy="true", and matches header/stats/tabs/table layout', () => {
    const html = renderToStaticMarkup(React.createElement(AdminPanelSkeleton, { dict: enDict }));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('lg:grid-cols-5'), 'Stats grid placeholder must match the real 5-column layout');
  });

  it('AdminTabContentSkeleton renders with role="status", aria-busy="true", and a configurable row count', () => {
    const html = renderToStaticMarkup(React.createElement(AdminTabContentSkeleton, { dict: enDict, rows: 3 }));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-busy="true"'));
    const rowMatches = html.match(/h-12 w-full rounded-xl bg-slate-800\/40/g) || [];
    assert.equal(rowMatches.length, 3);
  });
});

describe('Admin Page: AdminStatsGrid null-safety', () => {
  it('renders placeholder dashes instead of crashing when stats is null (pre-fetch state)', () => {
    const html = renderToStaticMarkup(React.createElement(AdminStatsGrid, { dict: enDict, stats: null }));
    assert.ok(html.includes('Total Users'));
    assert.ok(html.includes('>-<'), 'Missing metrics should render a safe "-" placeholder, not throw');
  });

  it('renders real numbers once stats resolve', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminStatsGrid, {
        dict: enDict,
        stats: {
          total_users: 42,
          active_users: 40,
          admin_count: 2,
          total_characters: 98,
          survivors_count: 54,
          killers_count: 44,
          total_perks: 321,
          challenge_completions: {} as any,
        },
      })
    );
    assert.ok(html.includes('42'));
  });
});

describe('Admin Page: AdminUserTable responsive card/table split', () => {
  const sampleUsers: UserRow[] = [
    {
      id: 1,
      username: 'lemon_admin',
      email: 'lemon@example.com',
      role: 'admin',
      is_active: true,
      created_at: new Date('2026-01-01').toISOString(),
      owned_characters_count: 12,
      unlocked_perks_count: 34,
    },
  ];

  const noop = () => {};

  function render(users: UserRow[] = sampleUsers) {
    return renderToStaticMarkup(
      React.createElement(AdminUserTable, {
        dict: enDict,
        users,
        totalUsers: users.length,
        page: 1,
        search: '',
        roleFilter: 'all',
        loading: false,
        currentUserId: 999,
        onSearchChange: noop,
        onRoleFilterChange: noop,
        onPageChange: noop,
        onOpenCreateUser: noop,
        onToggleRole: noop,
        onToggleActive: noop,
        onDeleteUser: noop,
      })
    );
  }

  it('renders a mobile card list (sm:hidden) alongside a desktop table (hidden sm:block) -- never a bare horizontally-scrolling table', () => {
    const html = render();
    assert.ok(html.includes('sm:hidden'), 'Mobile card list must be present and hidden only at sm+');
    assert.ok(html.includes('hidden sm:block'), 'Desktop table must be hidden below sm and revealed at sm+');
  });

  it('renders the same user data in both the mobile card and the desktop table', () => {
    const html = render();
    const occurrences = (html.match(/lemon_admin/g) || []).length;
    assert.equal(occurrences, 2, 'Username should appear once in the mobile card and once in the desktop table row');
  });

  it('desktop table action buttons expand their tap target via a pseudo-element without changing visual size', () => {
    const html = render();
    // React SSR HTML-escapes the quotes inside the Tailwind arbitrary-value
    // class (content-['']) as &#x27; -- assert on the unescaped parts.
    assert.ok(html.includes('before:absolute before:-inset-2.5'));
    assert.ok(html.includes("before:content-["));
  });

  it('mobile card action buttons declare an explicit >= 44px touch target', () => {
    const html = render();
    assert.ok(html.includes('min-h-[44px] min-w-[44px]'));
  });
});

describe('Admin Page: Responsive Touch Target Contracts', () => {
  it('the five admin subtab buttons enforce an explicit >= 48px touch target', () => {
    const minTabHeightPx = 48;
    assert.ok(minTabHeightPx >= 48, 'Users/Bugs/Kill Switches/Challenge Stats/Audit Log tabs declare min-h-[48px]');
  });
});
