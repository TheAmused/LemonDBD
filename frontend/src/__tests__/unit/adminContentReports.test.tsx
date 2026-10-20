// frontend/src/__tests__/unit/adminContentReports.test.tsx
//
// The admin side of content moderation: the evidence preview, the case view, the shared queue and the tab.
// Before this existed an admin had no screen at all for reported tier lists, rosters or minigames.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { buildEvidencePreview, isSafeLocalPreviewImage, isSafePreviewImage, parseEvidence } from '@/utils/contentPreview';
import { ContentReportDetail } from '@/components/admin/ContentReportDetail';
import { SandboxedContentPreview } from '@/components/admin/SandboxedContentPreview';
import { AdminQueue } from '@/components/admin/AdminQueue';
import { AdminSectionTabs } from '@/components/admin/AdminSectionTabs';
import { isAdminTab } from '@/components/admin/adminTabs';
import {
  BUG_STATUSES,
  CONTENT_STATUSES,
  bugStatusLabel,
  contentReasonLabel,
  contentStatusLabel,
  contentTypeLabel,
} from '@/components/admin/reportLabels';
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
// As it appears in rendered HTML: the label has an apostrophe, which React escapes.
const AUTHOR_ACTION_LABEL = en.moderation.admin.authorActionLabel.replace(/'/g, '&#x27;');
const showUser = () => {};

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

  it('loads a /static/ path only when it is a plain raster file of our own', () => {
    assert.equal(isSafeLocalPreviewImage('/static/tier-lists/banner.webp'), true);
    assert.equal(isSafeLocalPreviewImage('/static/icons/perks/sprint_burst.png'), true);
    // Each of these reaches another endpoint (with the admin's cookie) once the browser resolves it.
    for (const evil of [
      '/static/../api/v1/admin/database/export',
      '/static/../api/v1/users/1/export?x=.png',
      '/static/%2e%2e/api/v1/admin/stats.png',
      '/static/./../api/v1/x.png',
      '/static//evil.example/a.png',
      '/static/a\\..\\b.png',
      '/static/icons/perk.svg',
      '/static/icons/',
    ]) {
      assert.equal(isSafeLocalPreviewImage(evil), false, evil);
    }
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
      React.createElement(ContentReportDetail, { detail: baseDetail, resolving: false, onResolve: noop, onShowUser: showUser })
    );
    assert.ok(html.includes(en.admin.contentReportBanAction));
    assert.ok(html.includes(en.admin.contentReportDismissAction));
    assert.ok(html.includes(en.admin.contentReasonHate));
    assert.ok(html.includes('&lt;b&gt;insults&lt;/b&gt;'), 'reporter notes are free text and must be escaped');
    assert.ok(html.includes('the_author'));
    // The author decision is a dropdown: closed, it shows its label and the selected "nothing" option.
    assert.ok(html.includes(AUTHOR_ACTION_LABEL));
    assert.ok(html.includes(en.moderation.admin.authorActionNone));
  });

  it('explains an unattributed report and offers no author decision', () => {
    const detail = { ...baseDetail, attributed: false, author_id: null, author_login: '', author_active: null };
    const html = renderWithDictionary(React.createElement(ContentReportDetail, { detail, resolving: false, onResolve: noop, onShowUser: showUser }));
    assert.ok(html.includes(en.admin.contentReportUnattributed));
    assert.ok(!html.includes(AUTHOR_ACTION_LABEL));
  });

  it('never offers a decision about an admin author', () => {
    const detail = { ...baseDetail, author_is_admin: true };
    const html = renderWithDictionary(React.createElement(ContentReportDetail, { detail, resolving: false, onResolve: noop, onShowUser: showUser }));
    assert.ok(html.includes(en.admin.contentReportAuthorIsAdmin));
    assert.ok(!html.includes(AUTHOR_ACTION_LABEL));
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
    const html = renderWithDictionary(React.createElement(ContentReportDetail, { detail, resolving: false, onResolve: noop, onShowUser: showUser }));
    assert.ok(html.includes(en.admin.contentReportEvidenceWiped));
    assert.ok(html.includes('Slur in the title'));
    assert.ok(!html.includes(en.admin.contentReportDismissAction));
  });
});

describe('AdminQueue', () => {
  const props = {
    title: 'Content reports',
    drawerKey: 'content',
    ariaLabel: 'Filter by status',
    statuses: CONTENT_STATUSES,
    status: 'pending' as const,
    onStatusChange: () => {},
    statusLabel: (status: string) => contentStatusLabel({ admin: en.admin }, status),
    stats: { pending: 1, resolved_banned: 2, dismissed: 0, expired: 0, total: 3 },
    items: [baseReport],
    total: 1,
    page: 1,
    onPageChange: () => {},
    loading: false,
    selectedId: 4,
    onSelect: () => {},
    renderItem: (report: AdminContentReport) => contentTypeLabel({ admin: en.admin }, report.content_type),
    emptyText: en.admin.contentReportsEmpty,
    detail: React.createElement('p', null, 'the case'),
  };

  it('lists the queue, puts each count on its status chip and shows the case beside it', () => {
    const html = renderWithDictionary(React.createElement(AdminQueue<string, AdminContentReport>, props));
    assert.ok(html.includes(en.admin.contentTypeTierList));
    assert.ok(html.includes(`${en.admin.contentStatusBanned} (2)`));
    assert.ok(html.includes(`${en.admin.statusAll} (3)`));
    assert.ok(html.includes('the case'));
  });

  it('shows the empty state and the select prompt when nothing is queued', () => {
    const html = renderWithDictionary(
      React.createElement(AdminQueue<string, AdminContentReport>, { ...props, items: [], total: 0, selectedId: null, detail: null })
    );
    assert.ok(html.includes(en.admin.contentReportsEmpty));
    assert.ok(html.includes(en.admin.queueSelectPrompt));
  });

  it('only shows a search box when the queue has one', () => {
    const without = renderWithDictionary(React.createElement(AdminQueue<string, AdminContentReport>, props));
    assert.ok(!without.includes('type="search"'));
    const withSearch = renderWithDictionary(
      React.createElement(AdminQueue<string, AdminContentReport>, { ...props, search: { value: '', onChange: () => {}, placeholder: 'Find' } })
    );
    assert.ok(withSearch.includes('type="search"'));
  });
});

describe('Reports tab', () => {
  it('is a known admin tab and marks waiting reports with a dot, not a second count', () => {
    assert.equal(isAdminTab('reports'), true);
    assert.equal(isAdminTab('bugs'), false, 'bug reports moved into the Reports tab');
    const render = (reportsWaiting: boolean) =>
      renderWithDictionary(React.createElement(AdminSectionTabs, { activeTab: 'reports', onChange: () => {}, reportsWaiting }));
    assert.ok(render(true).includes(`aria-label="${en.admin.needsAttention}"`));
    assert.ok(!render(false).includes(en.admin.needsAttention));
    assert.ok(!/\(\d+\)/.test(render(true)), 'the tabs carry no numbers');
    assert.ok(render(false).includes('aria-haspopup="menu"'), 'Reports opens a menu of the two queues');
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
    for (const status of BUG_STATUSES) assert.notEqual(bugStatusLabel(dict, status), status);
  });
});
