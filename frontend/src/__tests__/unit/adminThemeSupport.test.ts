// frontend/src/__tests__/unit/adminThemeSupport.test.ts
//
// Every admin surface paints with the theme tokens (light, dark and lemon themes), never raw colours.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { renderUsers } from '../helpers/adminFixtures';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminAuditSection } from '@/components/admin/AdminAuditSection';
import { AdminAvailabilitySection } from '@/components/admin/AdminAvailabilitySection';
import { BugReportDetail } from '@/components/admin/BugReportDetail';
import en from '@/locales/en';

const RAW_COLOUR = /\b(?:bg|text|border)-(?:slate|gray|zinc|neutral|white|black)\b/;
const noop = () => {};
const asyncOk = async () => true;

function assertThemed(html: string, label: string) {
  assert.ok(html.includes('border-border-color'), `${label}: themed border`);
  assert.ok(html.includes('text-text-primary'), `${label}: themed text`);
  assert.ok(!RAW_COLOUR.test(html), `${label}: no raw palette colours`);
}

describe('Admin Theme Support', () => {
  it('the header uses themed text and offers analytics and refresh', () => {
    const html = renderWithDictionary(React.createElement(AdminHeader, { onRefresh: noop }));
    assert.ok(html.includes('text-text-primary'));
    assert.ok(html.includes(en.admin.analytics));
    assert.ok(html.includes(en.admin.refresh));
    assert.ok(!RAW_COLOUR.test(html));
  });

  it('the user directory', () => {
    const html = renderUsers();
    assertThemed(html, 'users');
    assert.ok(html.includes('bg-bg-surface'));
    assert.ok(html.includes('bg-bg-elevated'), 'table head');
  });

  it('the audit log', () => {
    const html = renderWithDictionary(React.createElement(AdminAuditSection, { refreshKey: 0, notify: noop }));
    assert.ok(html.includes('bg-bg-surface') && html.includes('border-border-color'));
    assert.ok(html.includes(en.admin.loadingAuditLog));
  });

  it('availability', () => {
    const html = renderWithDictionary(React.createElement(AdminAvailabilitySection, { refreshKey: 0, notify: noop }));
    assertThemed(html, 'availability');
    assert.ok(html.includes(en.admin.challengeModesTitle));
  });

  it('a bug report, with its status picker and reply box', () => {
    const html = renderWithDictionary(
      React.createElement(BugReportDetail, {
        report: {
          id: 1,
          title: 'Test bug',
          message: 'A test report',
          status: 'pending',
          reporter_name: 'tester',
          reporter_email: 'tester@test.com',
          images: [],
          created_at: new Date().toISOString(),
        },
        onStatusChange: asyncOk,
        onReply: asyncOk,
        onDelete: asyncOk,
        onShowUser: noop,
      })
    );
    assertThemed(html, 'bug report');
    assert.ok(html.includes(en.admin.guestReporter), 'a report without an account says it came from a guest');
    assert.ok(html.includes(en.admin.devFeedbackLabel));
  });
});
