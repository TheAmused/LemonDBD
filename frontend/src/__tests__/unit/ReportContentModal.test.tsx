// frontend/src/__tests__/unit/ReportContentModal.test.tsx
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import type { ContentManifest } from '@/utils/contentSigning';
import en from '@/locales/en';
import {
  ReportContentModal,
  ReportContentModalBody,
  REPORT_REASONS,
  submitContentReport,
  type ReportReason,
} from '@/components/common/ReportContentModal';

const MOCK_MANIFEST: ContentManifest = {
  content_type: 'tier_list',
  content_hash: 'c'.repeat(64),
  author_id: 123,
  author_login: 'entity_worshipper',
  signature: 'd'.repeat(64),
  created_at: '2026-10-14T10:00:00Z',
};

const MOCK_PAYLOAD = {
  title: 'Controversial Tier List',
  tiers: [{ id: 's', label: 'S', color: 's' }],
  items: [{ id: 'item-1', name: 'Entity Claw' }],
  placements: { s: ['item-1'] },
};

const t = en.tierLists;

describe('ReportContentModal: Rendering & States', () => {
  it('renders unsigned / no-manifest explanation when manifest is null', () => {
    const html = renderWithDictionary(
      React.createElement(ReportContentModalBody, {
        manifest: null,
        contentType: 'tier_list',
        payload: MOCK_PAYLOAD,
        contentTitle: 'Draft List',
        onClose: () => {},
      })
    );

    assert.ok(html.includes(t.reportNoManifest), 'should render unsigned notice when manifest is missing');
    assert.ok(!html.includes('name="report_reason"'), 'should not render reason radios when unsigned');
    assert.ok(!html.includes(t.reportSubmit), 'should not render submit button when unsigned');
  });

  it('renders all 5 reason options, notes textarea and submit button when manifest exists', () => {
    const html = renderWithDictionary(
      React.createElement(ReportContentModalBody, {
        manifest: MOCK_MANIFEST,
        contentType: 'tier_list',
        payload: MOCK_PAYLOAD,
        contentTitle: 'Live Signed List',
        onClose: () => {},
      })
    );

    assert.ok(html.includes(t.reportReasonHate), 'renders hate speech option');
    assert.ok(html.includes(t.reportReasonHarassment), 'renders harassment option');
    assert.ok(html.includes(t.reportReasonExplicit), 'renders explicit option');
    assert.ok(html.includes(t.reportReasonIllegal), 'renders illegal option');
    assert.ok(html.includes(t.reportReasonOther), 'renders other option');
    assert.ok(html.includes(t.reportNotesLabel), 'renders notes label');
    assert.ok(html.includes(t.reportNotesPlaceholder), 'renders notes placeholder');
    assert.ok(html.includes(t.reportSubmit), 'renders submit button');
    assert.equal(REPORT_REASONS.length, 5, 'defines exactly 5 canonical report reasons');
  });

  it('renders success state feedback when submission succeeds', () => {
    const html = renderWithDictionary(
      React.createElement(ReportContentModalBody, {
        manifest: MOCK_MANIFEST,
        contentType: 'tier_list',
        payload: MOCK_PAYLOAD,
        contentTitle: 'Live Signed List',
        status: 'success',
        onClose: () => {},
      })
    );

    assert.ok(html.includes(t.reportSuccess), 'renders success notice');
    assert.ok(!html.includes('name="report_reason"'), 'hides form when success state');
  });

  it('renders already_banned state feedback when content was previously banned', () => {
    const html = renderWithDictionary(
      React.createElement(ReportContentModalBody, {
        manifest: MOCK_MANIFEST,
        contentType: 'tier_list',
        payload: MOCK_PAYLOAD,
        contentTitle: 'Banned Content',
        status: 'already_banned',
        onClose: () => {},
      })
    );

    assert.ok(html.includes(t.reportAlreadyBanned), 'renders already banned notice');
    assert.ok(!html.includes('name="report_reason"'), 'hides form when already banned');
  });

  it('renders error notice when submission fails', () => {
    const html = renderWithDictionary(
      React.createElement(ReportContentModalBody, {
        manifest: MOCK_MANIFEST,
        contentType: 'tier_list',
        payload: MOCK_PAYLOAD,
        contentTitle: 'Error Test',
        status: 'error',
        onClose: () => {},
      })
    );

    assert.ok(html.includes(t.reportError), 'renders error feedback');
    assert.ok(html.includes(t.reportSubmit), 'keeps form active to allow retry');
  });
});

describe('ReportContentModal: Submission API logic', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('submits report with correct JSON payload and credentials to /api/v1/content/reports', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          status: 'pending',
          message: 'Report created successfully',
          content_hash: MOCK_MANIFEST.content_hash,
          report_id: 1,
        }),
      } as Response;
    };

    const res = await submitContentReport({
      contentType: 'tier_list',
      manifest: MOCK_MANIFEST,
      payload: MOCK_PAYLOAD,
      reason: 'hate_speech',
      notes: 'Contains offensive symbols',
    });

    assert.equal(res.ok, true);
    assert.equal(res.status, 'pending');
    assert.ok(capturedUrl.endsWith('/api/v1/content/reports'));
    assert.equal(capturedInit?.method, 'POST');
    assert.equal(capturedInit?.credentials, 'include');

    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get('Content-Type'), 'application/json');

    const sentBody = JSON.parse(String(capturedInit?.body));
    assert.equal(sentBody.content_type, 'tier_list');
    assert.equal(sentBody.content_hash, MOCK_MANIFEST.content_hash);
    assert.equal(sentBody.author_id, MOCK_MANIFEST.author_id);
    assert.equal(sentBody.author_login, MOCK_MANIFEST.author_login);
    assert.equal(sentBody.signature, MOCK_MANIFEST.signature);
    assert.deepEqual(sentBody.payload, MOCK_PAYLOAD);
    assert.equal(sentBody.reason, 'hate_speech');
    assert.equal(sentBody.notes, 'Contains offensive symbols');
  });

  it('strips _manifest from payload before sending to backend to prevent HMAC hash mismatch', async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return {
        ok: true,
        status: 201,
        json: async () => ({ status: 'pending', content_hash: MOCK_MANIFEST.content_hash }),
      } as Response;
    };

    const payloadWithManifest = {
      ...MOCK_PAYLOAD,
      _manifest: MOCK_MANIFEST,
    };

    const res = await submitContentReport({
      contentType: 'tier_list',
      manifest: MOCK_MANIFEST,
      payload: payloadWithManifest,
      reason: 'hate_speech',
    });

    assert.equal(res.ok, true);
    const sentBody = JSON.parse(String(capturedInit?.body));
    assert.deepEqual(sentBody.payload, MOCK_PAYLOAD);
    assert.equal('_manifest' in sentBody.payload, false);
  });

  it('handles already_banned status from backend correctly', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'already_banned',
          message: 'Content has been revoked and blocked',
          content_hash: MOCK_MANIFEST.content_hash,
        }),
      } as Response);

    const res = await submitContentReport({
      contentType: 'tier_list',
      manifest: MOCK_MANIFEST,
      payload: MOCK_PAYLOAD,
      reason: 'illegal',
    });

    assert.equal(res.ok, true);
    assert.equal(res.status, 'already_banned');
  });

  it('handles backend error responses gracefully', async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Content signature verification failed' }),
      } as Response);

    const res = await submitContentReport({
      contentType: 'tier_list',
      manifest: MOCK_MANIFEST,
      payload: MOCK_PAYLOAD,
      reason: 'other',
    });

    assert.equal(res.ok, false);
    assert.equal(res.status, 'error');
  });

  it('handles network failure gracefully', async () => {
    globalThis.fetch = async () => {
      throw new Error('Network offline');
    };

    const res = await submitContentReport({
      contentType: 'tier_list',
      manifest: MOCK_MANIFEST,
      payload: MOCK_PAYLOAD,
      reason: 'harassment',
    });

    assert.equal(res.ok, false);
    assert.equal(res.status, 'error');
  });
});

describe('ReportContentModal: Component Architecture & Source Wiring', () => {
  const componentPath = path.resolve(__dirname, '../../components/common/ReportContentModal.tsx');
  const src = fs.readFileSync(componentPath, 'utf-8');

  it('uses the shared Modal component instead of a hand-rolled dialog', () => {
    assert.match(src, /import\s+\{[^}]*Modal[^}]*\}\s+from\s+['"]@\/components\/common\/Modal['"]/);
    assert.match(src, /<Modal[\s\S]*isOpen=\{isOpen\}[\s\S]*onClose=\{onClose\}/);
  });

  it('uses useDictionary for i18n and references tierLists locale domain', () => {
    assert.match(src, /useDictionary\(\)/);
    assert.match(src, /dict\.tierLists/);
  });

  it('adheres to strict theme token usage (no raw black/white/gray/slate tokens)', () => {
    assert.doesNotMatch(src, /\b(bg-white|text-white|bg-black|text-black|text-slate-|bg-slate-|text-gray-|bg-gray-)\b/);
  });

  it('does not exceed 600 lines guard limit', () => {
    const lines = src.split('\n').length;
    assert.ok(lines <= 600, `ReportContentModal.tsx is ${lines} lines, must be <= 600`);
  });
});
