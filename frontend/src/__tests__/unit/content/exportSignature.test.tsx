// frontend/src/__tests__/unit/content/exportSignature.test.tsx
//
// Custom tier lists, rosters and minigames only leave the app signed with the author's account. The
// export modal shows nothing exportable until the server has signed the document, and there is no
// unsigned fallback when signing fails or nobody is signed in.
import { render, routeFetch, screen, TEST_USER, waitFor, withAppProviders } from '../../helpers/dom';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { ExportModal } from '@/components/common/ExportModal';

const doc = { format: 'lemondbd-tier-list', version: 1, title: 'Mine', tiers: [], items: [], placements: {} };
const labels = {
  title: 'Export', shareLinkLabel: 'Share link', preparingLink: 'Preparing...', copyLink: 'Copy link', linkTooLong: 'Long {count}',
  jsonLabel: 'JSON', downloadFile: 'Download', copyJson: 'Copy JSON', copied: 'Copied', copyFailed: 'Copy failed',
};
const manifest = {
  content_type: 'tier_list', content_hash: 'a'.repeat(64), author_id: 1, author_login: 'alice', signature: 'b'.repeat(64), created_at: '2026-10-26T10:00:00Z',
};

let api: ReturnType<typeof routeFetch> | null = null;
afterEach(() => api?.restore());

function openExport(signedIn: boolean, sign: { status?: number; body: unknown }) {
  api = routeFetch({
    '/auth/me': { body: signedIn ? { authenticated: true, user: TEST_USER } : { authenticated: false } },
    '/site-config': { body: {} },
    'POST /content/sign': sign,
  });
  render(
    <ExportModal
      doc={doc}
      onClose={() => {}}
      locale="en"
      labels={labels}
      idPrefix="tier-list"
      serialize={(d) => JSON.stringify(d)}
      fileName={() => 'list.json'}
      encodePayload={async () => 'payload'}
      buildShareUrl={(origin, locale, payload) => `${origin}/${locale}/tier-lists/new#import=${payload}`}
      shareLinkWarnChars={2000}
      labelClassName=""
    />,
    { wrapper: withAppProviders().wrapper }
  );
}

const jsonField = () => document.getElementById('tier-list-json') as HTMLTextAreaElement;
const linkField = () => document.getElementById('tier-list-share-link') as HTMLInputElement;
const downloadButton = () => screen.getByRole('button', { name: /Download/ }) as HTMLButtonElement;

describe('export needs a signature', () => {
  it('a signed-in author gets the signed document and a share link', async () => {
    openExport(true, { body: manifest });
    await waitFor(() => assert.ok(jsonField().value.includes('"_manifest"')));
    await waitFor(() => assert.ok(linkField().value.endsWith('#import=payload')));
    assert.equal(downloadButton().disabled, false);
    assert.ok(!screen.queryByText(en.tierLists.signFailed));
  });

  it('when the server refuses to sign, nothing is exportable and the reason is shown', async () => {
    openExport(true, { status: 500, body: {} });
    await waitFor(() => assert.ok(screen.getByText(en.tierLists.signFailed)));
    assert.equal(jsonField().value, '');
    assert.equal(linkField().value, '');
    assert.equal(downloadButton().disabled, true);
  });

  it('a signed-out visitor cannot export unsigned content either', async () => {
    openExport(false, { body: manifest });
    await waitFor(() => assert.ok(screen.getByText(en.tierLists.signFailed)));
    assert.equal(jsonField().value, '');
    assert.ok(!api!.calls.some((c) => c.url.includes('/content/sign')), 'nothing is sent for signing');
  });
});
