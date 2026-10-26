// frontend/src/__tests__/unit/user/userResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';
import { UserBugReportsSkeleton } from '@/components/user/UserBugReportsSkeleton';
import { UserBugReportsList } from '@/components/user/UserBugReportsList';
import { UserBugReportsDrawer } from '@/components/user/UserBugReportsDrawer';
import type { UserBugReport } from '@/types/userProfile';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';

describe('User Page: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('UserProfileSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(React.createElement(UserProfileSkeleton));

    assert.ok(html.includes('<output'), 'Skeleton should declare a status region (<output>)');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Profile skeleton must render DBD Skill Check SVG');
  });

  it('UserBugReportsSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(
      React.createElement(UserBugReportsSkeleton, {})
    );
    assert.ok(html.includes('<output'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('viewBox="0 0 160 160"'));
  });

});

describe('User Page: UserBugReportsList status badges & pagination', () => {
  const baseReport: UserBugReport = {
    id: 1,
    title: 'Perk tooltip cut off',
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
      const html = renderWithDictionary(
        React.createElement(UserBugReportsList, {
          loading: false,
          onOpenReportModal: () => {},
          reports: [{ ...baseReport, status }],
        })
      );
      assert.ok(html.includes(expectedLabel[status]), `Expected "${expectedLabel[status]}" badge for status ${status}`);
    }
  });

  it('renders the loading skeleton (not the reports grid) while loading is true', () => {
    const html = renderWithDictionary(
      React.createElement(UserBugReportsList, {
        loading: true,
        onOpenReportModal: () => {},
        reports: [],
      })
    );
    assert.ok(html.includes('aria-busy="true"'), 'Should render the skeleton fallback while loading');
    assert.ok(!html.includes('Perk tooltip cut off'));
  });

  it('renders empty state copy when there are zero reports and loading has finished', () => {
    const html = renderWithDictionary(
      React.createElement(UserBugReportsList, {
        loading: false,
        onOpenReportModal: () => {},
        reports: [],
      })
    );
    assert.ok(html.includes('No Bug Reports Submitted'));
  });

  it('renders Pagination navigation only when totalPages > 1 and onPageChange is provided', () => {
    const withoutPagination = renderWithDictionary(
      React.createElement(UserBugReportsList, {
        loading: false,
        onOpenReportModal: () => {},
        reports: [baseReport],
        total: 1,
        totalPages: 1,
      })
    );
    assert.ok(!withoutPagination.includes('Pagination Navigation'));

    const withPagination = renderWithDictionary(
      React.createElement(UserBugReportsList, {
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

  const renderList = (report: UserBugReport) =>
    renderWithDictionary(
      React.createElement(UserBugReportsList, {
        loading: false,
        onOpenReportModal: () => {},
        reports: [report],
      })
    );

  it('starts every report collapsed and does not show the ticket id', () => {
    const html = renderList({ ...baseReport, id: 4242 });
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(!html.includes('aria-expanded="true"'));
    assert.ok(!html.includes('#4242'), 'The internal ticket id must not be shown');
  });

  it('tells the reader there is no developer response yet for pending and in progress reports', () => {
    for (const status of ['pending', 'in_progress'] as const) {
      const html = renderList({ ...baseReport, status });
      assert.ok(html.includes('No response from the developers yet'), `Expected the empty reply note for ${status}`);
    }
  });

  it('shows the developer reply instead of the empty note once there is one', () => {
    const html = renderList({ ...baseReport, status: 'in_progress', admin_notes: 'Looking into it.' });
    assert.ok(html.includes('Looking into it.'));
    assert.ok(!html.includes('No response from the developers yet'));
  });

  it('does not show the empty reply note for a closed report without a reply', () => {
    const html = renderList({ ...baseReport, status: 'rejected' });
    assert.ok(!html.includes('No response from the developers yet'));
  });

  it('marks only reports with unseen feedback with the pulsing dot', () => {
    const unread = renderList({ ...baseReport, status: 'resolved', feedback_unread: true });
    assert.ok(unread.includes('animate-ping'));
    assert.ok(unread.includes('New feedback from the developers'));

    const seen = renderList({ ...baseReport, status: 'resolved', feedback_unread: false });
    assert.ok(!seen.includes('animate-ping'));
  });

  it('shows the pulsing dot on the collapsed drawer header when there is unseen feedback', () => {
    const html = renderWithDictionary(
      React.createElement(UserBugReportsDrawer, {
        reports: [],
        loading: false,
        onOpenReportModal: () => {},
        total: 3,
        unreadCount: 2,
        page: 1,
        perPage: 10,
        totalPages: 1,
        onPageChange: () => {},
        onReportSeen: () => {},
      })
    );
    assert.ok(html.includes('animate-ping'));
  });
});

describe('User Page: i18n key parity across all supported locales', () => {
  const newKeys = [
    'avatarSizeLimit',
    'avatarUploadFailed',
    'avatarUpdateSuccess',
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


