import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { AdminAuditLogView } from '@/components/admin/AdminAuditLogView';
import { AdminBugReportsWorkbench } from '@/components/admin/AdminBugReportsWorkbench';
import { AdminChallengeControl } from '@/components/admin/AdminChallengeControl';
import { AdminChallengeStats } from '@/components/admin/AdminChallengeStats';

describe('Admin Theme Support', () => {
  it('AdminHeader title supports light mode and dark mode text', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminHeader, {
        isSyncing: false,
        syncStatus: 'idle',
        isLoading: false,
        onOpenDbMaintenance: () => {},
        onTriggerSync: () => {},
        onRefreshData: () => {},
      })
    );
    assert.ok(html.includes('dark:text-slate-100'), 'Title must have dark:text-slate-100');
    assert.ok(html.includes('text-slate-900'), 'Title must have text-slate-900 for light mode');
    assert.ok(html.includes('border-slate-200'), 'Divider must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Divider must have dark:border-slate-800');
  });

  it('AdminStatsGrid cards use light-compatible border and background', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminStatsGrid, {
        stats: {
          total_users: 10,
          active_users: 8,
          admin_count: 2,
          total_characters: 98,
          survivors_count: 50,
          killers_count: 48,
          total_perks: 321,
          challenge_completions: {
            gauntlet: { total: { completed_runs: 0, unique_users: 0 }, by_variant: {} },
            chaos: { total: { completed_runs: 0, unique_users: 0 }, by_variant: {} },
            history: { total: { completed_runs: 0, unique_users: 0 }, by_variant: {} },
            page_streak: { total: { completed_runs: 0, unique_users: 0 }, by_variant: {} },
          },
        },
      })
    );
    assert.ok(html.includes('border-slate-200'), 'Stats cards must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Stats cards must have dark:border-slate-800');
    assert.ok(html.includes('text-slate-900'), 'Value numbers must have text-slate-900');
    assert.ok(html.includes('dark:text-slate-100'), 'Value numbers must have dark:text-slate-100');
  });

  it('AdminUserTable outer card and search input support light and dark theme contrast', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminUserTable, {
        users: [
          {
            id: 1,
            username: 'admin',
            email: 'admin@test.com',
            role: 'admin',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
            owned_characters_count: 5,
            unlocked_perks_count: 20,
          },
        ],
        totalUsers: 1,
        page: 1,
        search: '',
        roleFilter: 'all',
        loading: false,
        onSearchChange: () => {},
        onRoleFilterChange: () => {},
        onPageChange: () => {},
        onOpenCreateUser: () => {},
        onToggleRole: () => {},
        onToggleActive: () => {},
        onDeleteUser: () => {},
      })
    );
    assert.ok(html.includes('border-slate-200'), 'Outer card or table must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Outer card or table must have dark:border-slate-800');
    assert.ok(html.includes('bg-slate-50'), 'Search input or rows must have bg-slate-50 for light mode');
    assert.ok(html.includes('dark:bg-slate-950/80'), 'Search input must have dark:bg-slate-950/80');
    assert.ok(html.includes('bg-slate-100/80'), 'Thead must have bg-slate-100/80');
    assert.ok(html.includes('dark:bg-slate-950/50'), 'Thead must have dark:bg-slate-950/50');
  });

  it('AdminAuditLogView container card and headers support light and dark mode', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAuditLogView, {})
    );
    assert.ok(html.includes('border-slate-200'), 'Container card must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Container card must have dark:border-slate-800');
    assert.ok(html.includes('bg-white'), 'Container card must have bg-white');
    assert.ok(html.includes('dark:bg-slate-900/60'), 'Container card must have dark:bg-slate-900/60');
  });

  it('AdminBugReportsWorkbench supports light and dark theme classes', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminBugReportsWorkbench, {
        bugReports: [
          {
            id: 1,
            title: 'Test bug',
            message: 'A test report',
            category: 'gameplay',
            status: 'pending',
            reporter_name: 'tester',
            reporter_email: 'tester@test.com',
            images: [],
            created_at: new Date().toISOString(),
          },
        ],
        bugStats: { pending: 1, in_progress: 0, resolved: 0, rejected: 0, total: 1 },
        totalBugReports: 1,
        bugPage: 1,
        bugSearch: '',
        bugStatusFilter: 'all',
        selectedBugId: 1,
        editingNotes: {},
        loading: false,
        onSearchChange: () => {},
        onStatusFilterChange: () => {},
        onPageChange: () => {},
        onSelectBug: () => {},
        onNoteChange: () => {},
        onUpdateBug: () => {},
        onDeleteBug: () => {},
      })
    );
    assert.ok(html.includes('border-slate-200'), 'Workbench cards must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Workbench cards must have dark:border-slate-800');
    assert.ok(html.includes('bg-white'), 'Ticket inspector card must have bg-white');
  });

  it('AdminChallengeControl container supports light and dark modes', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminChallengeControl, {
        onActionMessage: () => {},
      })
    );
    assert.ok(html.includes('border-slate-200'), 'Challenge control cards must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Challenge control cards must have dark:border-slate-800');
    assert.ok(html.includes('bg-white'), 'Challenge control cards must have bg-white');
  });

  it('AdminChallengeStats cards support light and dark theme contrast', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminChallengeStats, {
        stats: {
          total_users: 10,
          active_users: 8,
          admin_count: 2,
          total_characters: 98,
          survivors_count: 50,
          killers_count: 48,
          total_perks: 321,
          challenge_completions: {
            gauntlet: { total: { completed_runs: 5, unique_users: 3 }, by_variant: {} },
            chaos: { total: { completed_runs: 2, unique_users: 2 }, by_variant: {} },
            history: { total: { completed_runs: 1, unique_users: 1 }, by_variant: {} },
            page_streak: { total: { completed_runs: 0, unique_users: 0 }, by_variant: {} },
          },
        },
      })
    );
    assert.ok(html.includes('bg-white'), 'Challenge stats cards must have bg-white');
    assert.ok(html.includes('dark:bg-slate-900/60'), 'Challenge stats cards must have dark:bg-slate-900/60');
    assert.ok(html.includes('text-slate-900'), 'Card title must have text-slate-900');
  });
});
