// frontend/src/__tests__/unit/adminContentReports.test.tsx
//
// The admin side of content moderation: the evidence preview, the report workbench and the tab.
// Before this existed an admin had no screen at all for reported tier lists, rosters or minigames.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { buildEvidencePreview, isSafePreviewImage, parseEvidence } from '@/utils/contentPreview';
import { ContentReportDetail } from '@/components/admin/ContentReportDetail';
import { SandboxedContentPreview } from '@/components/admin/SandboxedContentPreview';
import { AdminContentReportsWorkbench } from '@/components/admin/AdminContentReportsWorkbench';
import { AdminSectionTabs } from '@/components/admin/AdminSectionTabs';
import { isAdminTab } from '@/components/admin/adminTabs';
import { contentReasonLabel, contentStatusLabel, contentTypeLabel } from '@/components/admin/contentReportLabels';
import en from '@/locales/en';
import type { AdminContentReport, AdminContentReportDetail } from '@/types/admin';

const TIER_LIST_EVIDENCE = JSON.stringify({
  format: 'lemondbd-tier-list',
  version: 1,
  title: 'Worst killers',
  description: 'A <script>alert(1)</script> description',
  template: null,
  tiers: [{ id: 's', label: 'S', color: 'red' }],
  items: [
    { id: 'item-1', name: 'Entity Claw', image: 'https://cdn.example.com/a.png' },
    { id: 'item-2', name: 'Second item', image: 'javascript:alert(1)' },
  ],
  placements: { s: ['item-1', 'item-2'] },
  backgroundImage: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
});

const baseReport: AdminContentReport = {
  id: 4,
  content_type: 'tier_list',
  content_hash: 'a'.repeat(64),
  author_id: 9,
  author_login: 'the_author',
  report_count: 3,
  primary_reason: 'hate_speech',
  status: 'pending',
  admin_notes: null,
  resolved_at: null,
  expires_at: '2026-10-29T10:00:00Z',
  created_at: '2026-10-15T10:00:00Z',
  has_evidence: true,
};

const baseDetail: AdminContentReportDetail = {
  ...baseReport,
  evidence_payload: TIER_LIST_EVIDENCE,
  reports: [
    { reason: 'hate_speech', notes: 'This <b>insults</b> players', created_at: '2026-10-15T10:00:00Z' },
    { reason: 'spam', notes: null, created_at: '2026-10-15T11:00:00Z' },
  ],
  reason_breakdown: { hate_speech: 2, spam: 1 },
  attributed: true,
  author_active: true,
  author_is_admin: false,
};

const noop = async () => true;

describe('contentPreview', () => {
  it('lists the readable text of a document and leaves ids and placements out', () => {
    const preview = buildEvidencePreview(TIER_LIST_EVIDENCE);
    assert.ok(preview);
    assert.equal(preview.title, 'Worst killers');
    assert.ok(preview.texts.includes('Entity Claw'));
    assert.ok(preview.texts.includes('Second item'));
    assert.ok(!preview.texts.includes('item-1'), 'placement ids are not content');
    assert.ok(!preview.texts.includes('lemondbd-tier-list'), 'format markers are not content');
  });

  it('collects image URLs separately from text', () => {
    const preview = buildEvidencePreview(TIER_LIST_EVIDENCE);
    assert.ok(preview);
    assert.ok(preview.images.includes('https://cdn.example.com/a.png'));
    assert.ok(!preview.texts.includes('https://cdn.example.com/a.png'));
  });

  it('refuses to treat unparseable evidence as a document', () => {
    assert.equal(buildEvidencePreview('not json'), null);
    assert.equal(buildEvidencePreview('[1,2]'), null);
    assert.equal(buildEvidencePreview(null), null);
    assert.equal(parseEvidence(''), null);
  });

  it('caps a huge document instead of listing all of it', () => {
    const items = Array.from({ length: 400 }, (_, i) => ({ id: `i${i}`, name: `Name ${i}` }));
    const preview = buildEvidencePreview(JSON.stringify({ title: 't', items }));
    assert.ok(preview);
    assert.ok(preview.texts.length <= 150);
    assert.equal(preview.truncated, true);
  });

  it('only fetches https and inline raster images', () => {
    assert.equal(isSafePreviewImage('https://cdn.example.com/a.png'), true);
    assert.equal(isSafePreviewImage('data:image/png;base64,AAAA'), true);
    assert.equal(isSafePreviewImage('http://cdn.example.com/a.png'), false);
    assert.equal(isSafePreviewImage('javascript:alert(1)'), false);
    assert.equal(isSafePreviewImage('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), false);
    assert.equal(isSafePreviewImage('data:text/html;base64,AAAA'), false);
  });
});

describe('SandboxedContentPreview', () => {
  it('renders no <img> and no raw markup until the admin chooses to load images', () => {
    const html = renderWithDictionary(React.createElement(SandboxedContentPreview, { evidence: TIER_LIST_EVIDENCE }));
    assert.ok(!html.includes('<img'), 'images must stay hidden by default');
    assert.ok(!html.includes('<script>'), 'untrusted text is escaped, never injected');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes(en.admin.contentReportShowImages));
  });

  it('says so when the evidence cannot be read', () => {
    const html = renderWithDictionary(React.createElement(SandboxedContentPreview, { evidence: 'garbage' }));
    assert.ok(html.includes(en.admin.contentReportUnreadable));
  });
});

describe('ContentReportDetail', () => {
  it('offers ban and dismiss for a pending report, with the reasons and reporter notes', () => {
    const html = renderWithDictionary(
      React.createElement(ContentReportDetail, { detail: baseDetail, resolving: false, onResolve: noop })
    );
    assert.ok(html.includes(en.admin.contentReportBanAction));
    assert.ok(html.includes(en.admin.contentReportDismissAction));
    assert.ok(html.includes(en.admin.contentReasonHate));
    assert.ok(html.includes('&lt;b&gt;insults&lt;/b&gt;'), 'reporter notes are free text and must be escaped');
    assert.ok(html.includes('the_author'));
    for (const option of [en.moderation.admin.authorActionWarning, en.moderation.admin.authorActionSuspension, en.moderation.admin.authorActionBan]) {
      assert.ok(html.includes(option), option);
    }
  });

  it('explains an unattributed report and offers no author decision', () => {
    const detail = { ...baseDetail, attributed: false, author_id: null, author_login: '', author_active: null };
    const html = renderWithDictionary(React.createElement(ContentReportDetail, { detail, resolving: false, onResolve: noop }));
    assert.ok(html.includes(en.admin.contentReportUnattributed));
    assert.ok(!html.includes(en.moderation.admin.authorActionWarning));
  });

  it('never offers a decision about an admin author', () => {
    const detail = { ...baseDetail, author_is_admin: true };
    const html = renderWithDictionary(React.createElement(ContentReportDetail, { detail, resolving: false, onResolve: noop }));
    assert.ok(html.includes(en.admin.contentReportAuthorIsAdmin));
    assert.ok(!html.includes(en.moderation.admin.authorActionWarning));
  });

  it('shows a resolved report as read-only with the wiped-evidence note', () => {
    const detail: AdminContentReportDetail = {
      ...baseDetail,
      status: 'resolved_banned',
      evidence_payload: null,
      has_evidence: false,
      admin_notes: 'Slur in the title',
      resolved_at: '2026-10-16T10:00:00Z',
    };
    const html = renderWithDictionary(React.createElement(ContentReportDetail, { detail, resolving: false, onResolve: noop }));
    assert.ok(html.includes(en.admin.contentReportEvidenceWiped));
    assert.ok(html.includes('Slur in the title'));
    assert.ok(!html.includes(en.admin.contentReportDismissAction));
  });
});

describe('AdminContentReportsWorkbench', () => {
  const props = {
    list: { items: [baseReport], total: 1, pending_total: 1, page: 1, per_page: 20 },
    statusFilter: 'pending',
    page: 1,
    perPage: 20,
    loading: false,
    selectedId: 4,
    detail: baseDetail,
    loadingDetail: false,
    resolving: false,
    onStatusFilterChange: () => {},
    onPageChange: () => {},
    onSelect: () => {},
    onResolve: noop,
    onPurgeExpired: () => {},
  };

  it('lists the queue and shows the selected case beside it', () => {
    const html = renderWithDictionary(React.createElement(AdminContentReportsWorkbench, props));
    assert.ok(html.includes(en.admin.contentTypeTierList));
    assert.ok(html.includes(en.admin.contentReportBanAction));
    assert.ok(html.includes(en.admin.contentReportsPurgeExpired));
  });

  it('shows the empty state and the select prompt when nothing is queued', () => {
    const html = renderWithDictionary(
      React.createElement(AdminContentReportsWorkbench, {
        ...props,
        list: { items: [], total: 0, pending_total: 0, page: 1, per_page: 20 },
        selectedId: null,
        detail: null,
      })
    );
    assert.ok(html.includes(en.admin.contentReportsEmpty));
    assert.ok(html.includes(en.admin.contentReportsSelectPrompt));
  });

  it('does not show a previously loaded case for a different selection', () => {
    const html = renderWithDictionary(
      React.createElement(AdminContentReportsWorkbench, { ...props, selectedId: 99, loadingDetail: true })
    );
    assert.ok(!html.includes(en.admin.contentReportDismissAction));
    assert.ok(html.includes(en.admin.contentReportsLoading));
  });
});

describe('Reports tab', () => {
  it('is a known admin tab and shows the pending count', () => {
    assert.equal(isAdminTab('reports'), true);
    const html = renderWithDictionary(
      React.createElement(AdminSectionTabs, {
        activeTab: 'reports',
        onChange: () => {},
        totalUsers: 5,
        pendingBugs: 0,
        pendingReports: 7,
      })
    );
    assert.ok(html.includes(en.admin.contentReportsLabel));
    assert.ok(html.includes(`${en.admin.contentReportsLabel} (7)`) || html.includes('(7)'));
  });

  it('labels every status, type and reason the backend can store, and falls back to the raw value', () => {
    const dict = { admin: en.admin };
    for (const status of ['pending', 'resolved_banned', 'dismissed', 'expired']) {
      assert.notEqual(contentStatusLabel(dict, status), status);
    }
    for (const type of ['tier_list', 'smash_roster', 'minigame']) assert.notEqual(contentTypeLabel(dict, type), type);
    for (const reason of ['hate_speech', 'harassment', 'explicit', 'illegal', 'spam', 'other']) {
      assert.notEqual(contentReasonLabel(dict, reason), reason);
    }
    assert.equal(contentReasonLabel(dict, 'something_new'), 'something_new');
  });
});
