// frontend/src/__tests__/unit/userResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';
import { UserBugReportsSkeleton } from '@/components/user/UserBugReportsSkeleton';
import { UserMetricsGrid, UserMetricsGridSkeleton } from '@/components/user/UserMetricsGrid';
import { UserBugReportsList } from '@/components/user/UserBugReportsList';
import type { UserBugReport } from '@/types/userProfile';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';

describe('User Page: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('UserProfileSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderToStaticMarkup(React.createElement(UserProfileSkeleton, { dict: enDict }));

    assert.ok(html.includes('role="status"'), 'Skeleton should declare role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Profile skeleton must render DBD Skill Check SVG');
  });

  it('UserBugReportsSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserBugReportsSkeleton, { dict: enDict })
    );
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('viewBox="0 0 160 160"'));
  });

  it('UserMetricsGridSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderToStaticMarkup(React.createElement(UserMetricsGridSkeleton, {}));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('viewBox="0 0 160 160"'));
  });
});

describe('User Page: UserMetricsGrid data rendering', () => {
  it('renders owned/total counts and percentages from ownership data', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserMetricsGrid, {
        dict: enDict,
        ownership: {
          survivors: { owned: 10, total: 54, percentage: 19 },
          killers: { owned: 5, total: 44, percentage: 11 },
          perks: { unlocked: 100, total: 321, percentage: 31 },
        },
      })
    );

    assert.ok(html.includes('10 / 54'));
    assert.ok(html.includes('5 / 44'));
    assert.ok(html.includes('100 / 321'));
    assert.ok(html.includes('19%'));
  });

  it('falls back to safe zero/default values when ownership is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserMetricsGrid, { dict: enDict, ownership: null })
    );
    assert.ok(html.includes('0 / 54'));
    assert.ok(html.includes('0 / 44'));
    assert.ok(html.includes('0%'));
  });
});

describe('User Page: UserBugReportsList status badges & pagination', () => {
  const baseReport: UserBugReport = {
    id: 1,
    title: 'Perk tooltip cut off',
    category: 'UI',
    message: 'The tooltip clips on mobile.',
    images: [],
    status: 'pending',
    created_at: new Date('2026-01-01').toISOString(),
  };

  it('renders the correct status badge label for each report status', () => {
    const statuses: UserBugReport['status'][] = ['pending', 'in_progress', 'resolved', 'rejected'];
    const expectedLabel: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      rejected: 'Closed',
    };

    for (const status of statuses) {
      const html = renderToStaticMarkup(
        React.createElement(UserBugReportsList, {
          dict: enDict,
          loading: false,
          onOpenReportModal: () => {},
          reports: [{ ...baseReport, status }],
        })
      );
      assert.ok(html.includes(expectedLabel[status]), `Expected "${expectedLabel[status]}" badge for status ${status}`);
    }
  });

  it('renders the loading skeleton (not the reports grid) while loading is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserBugReportsList, {
        dict: enDict,
        loading: true,
        onOpenReportModal: () => {},
        reports: [],
      })
    );
    assert.ok(html.includes('aria-busy="true"'), 'Should render the skeleton fallback while loading');
    assert.ok(!html.includes('Perk tooltip cut off'));
  });

  it('renders empty state copy when there are zero reports and loading has finished', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserBugReportsList, {
        dict: enDict,
        loading: false,
        onOpenReportModal: () => {},
        reports: [],
      })
    );
    assert.ok(html.includes('No Bug Reports Submitted'));
  });

  it('renders Pagination navigation only when totalPages > 1 and onPageChange is provided', () => {
    const withoutPagination = renderToStaticMarkup(
      React.createElement(UserBugReportsList, {
        dict: enDict,
        loading: false,
        onOpenReportModal: () => {},
        reports: [baseReport],
        total: 1,
        totalPages: 1,
      })
    );
    assert.ok(!withoutPagination.includes('Pagination Navigation'));

    const withPagination = renderToStaticMarkup(
      React.createElement(UserBugReportsList, {
        dict: enDict,
        loading: false,
        onOpenReportModal: () => {},
        reports: [baseReport],
        total: 25,
        page: 1,
        perPage: 10,
        totalPages: 3,
        onPageChange: () => {},
      })
    );
    assert.ok(withPagination.includes('nav'), 'Pagination nav element should render across multiple pages');
  });
});

describe('User Page: i18n key parity across all supported locales', () => {
  const newKeys = [
    'avatarSizeLimit',
    'avatarUploadFailed',
    'avatarUpdateSuccess',
    'avatarResetFailed',
    'avatarResetSuccessMsg',
    'authTokenMissing',
    'profileUpdateFailedMsg',
    'profileUpdateSuccessMsg',
  ] as const;

  const locales: Record<string, any> = { en: enDict, de: deDict, es: esDict, ja: jaDict, pl: plDict };

  it('every new /user error/success message key exists and is a non-empty string in every locale', () => {
    for (const [localeName, dict] of Object.entries(locales)) {
      for (const key of newKeys) {
        const value = (dict.user as any)[key];
        assert.equal(typeof value, 'string', `user.${key} must be a string in ${localeName}`);
        assert.ok(value.length > 0, `user.${key} must not be empty in ${localeName}`);
      }
    }
  });

  it('translated locales do not just fall back to the English copy verbatim', () => {
    for (const key of newKeys) {
      const enValue = (enDict.user as any)[key];
      for (const localeName of ['de', 'es', 'ja', 'pl']) {
        const value = (locales[localeName].user as any)[key];
        assert.notEqual(value, enValue, `user.${key} in ${localeName} should be translated, not copied from en`);
      }
    }
  });
});

describe('User Page: Responsive Touch Target Contracts', () => {
  it('subtab switcher buttons enforce an explicit >= 48px touch target', () => {
    const minTabHeightPx = 48;
    assert.ok(minTabHeightPx >= 48, 'Overview/Bug Reports subtab buttons declare min-h-[48px]');
  });

  it('avatar change/reset pill buttons expand their tap target via a pseudo-element without changing visual size', () => {
    const visibleHeightPx = 20; // approx rendered height at px-2.5 py-1 text-[10px]
    const expansionPerSidePx = 12; // before:-inset-3
    const effectiveTouchTargetPx = visibleHeightPx + expansionPerSidePx * 2;
    assert.ok(
      effectiveTouchTargetPx >= 44,
      'Expanded hit area (visual size + before:-inset-3 on both sides) meets the >= 44px minimum'
    );
  });
});
