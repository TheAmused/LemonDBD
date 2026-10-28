// frontend/src/__tests__/unit/legal/legalRendering.test.tsx
//
// The legal pages and the preview dialog as a reader sees them.
import { render, screen, withNextApp, within } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { LegalDocPage } from '@/components/legal/LegalDocPage';
import { LegalDocModal } from '@/components/legal/LegalDocModal';
import { AboutClient } from '@/components/about/AboutClient';
import { legalDocText } from '@/components/legal/legalDocs';

describe('legal documents as rendered', () => {
  for (const doc of ['terms', 'rules'] as const) {
    it(`the ${doc} page says the summaries are not binding and which language prevails`, () => {
      render(<LegalDocPage doc={doc} />, { wrapper: withNextApp({ pathname: `/en/${doc}` }).wrapper });
      const text = legalDocText(en as never, doc);
      assert.ok(screen.getByText(text.tldrNotice));
      assert.ok(screen.getByText(text.translationNotice));
    });

    it(`the ${doc} preview dialog is a read-only preview: no accept button and no way to the full page`, () => {
      render(<LegalDocModal doc={doc} onClose={() => {}} />, { wrapper: withNextApp().wrapper });
      const dialog = screen.getByRole('dialog');
      const text = legalDocText(en as never, doc);
      assert.ok(within(dialog).getByText(text.tldrNotice));
      assert.ok(within(dialog).getByRole('button', { name: en.modal.close }), 'the header X closes it');
      const ownPage = doc === 'terms' ? '/en/terms-of-service' : '/en/rules';
      const hrefs = within(dialog).queryAllByRole('link').map((a) => a.getAttribute('href'));
      assert.ok(!hrefs.includes(ownPage), 'no "open the full page" link');
      assert.ok(!within(dialog).queryByRole('button', { name: /accept|agree/i }), 'no accept button: accepting happens in the sign-up form');
    });
  }
});

describe('about page legal links', () => {
  it('Terms, Privacy Policy and Rules are linked in that order, in the current language', () => {
    render(<AboutClient />, { wrapper: withNextApp({ pathname: '/en/about' }).wrapper });
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href')).filter((h) => /terms-of-service|privacy-policy|\/rules$/.test(h ?? ''));
    assert.deepEqual(hrefs, ['/en/terms-of-service', '/en/privacy-policy', '/en/rules']);
  });
});
