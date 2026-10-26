// frontend/src/__tests__/unit/app/siteConfigSwitches.test.tsx
//
// Admin switches from GET /api/v1/site-config change what the page does. The parsing helpers are
// tested directly; the scoreboard check is rendered with a stubbed site config, so a switched-off
// OCR and the configured upload limit are checked the way a user meets them.
import { render, screen, stubFetch, waitFor, withDictionary, fireEvent, act } from '../../helpers/dom';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { parseGoogleConfig } from '@/hooks/useGoogleConfig';
import { mustConfirmEmail } from '@/utils/emailVerification';
import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { ScoreboardCheckModal } from '@/components/common/ScoreboardCheckModal';
import { formatMessage } from '@/utils/i18nFormat';

describe('Google sign-in switch', () => {
  it('keeps the client id when sign-in is switched off (a Google-only account still confirms with it)', () => {
    assert.deepEqual(parseGoogleConfig({ enabled: false, client_id: 'abc.apps' }), { clientId: 'abc.apps', signInEnabled: false });
    assert.deepEqual(parseGoogleConfig({ enabled: true, client_id: 'abc.apps' }), { clientId: 'abc.apps', signInEnabled: true });
    assert.deepEqual(parseGoogleConfig({ enabled: true, client_id: '' }), { clientId: null, signInEnabled: true });
    assert.deepEqual(parseGoogleConfig(null), { clientId: null, signInEnabled: false });
  });
});

describe('e-mail confirmation switch', () => {
  it('an unconfirmed account is held back only while the site requires confirmation', () => {
    assert.equal(mustConfirmEmail({ is_verified: false }, true), true);
    assert.equal(mustConfirmEmail({ is_verified: false }, false), false);
    assert.equal(mustConfirmEmail({ is_verified: true }, true), false);
    assert.equal(mustConfirmEmail(null, true), false);
  });
});

describe('scoreboard check: OCR switch and upload limit', () => {
  let siteConfig: Record<string, unknown> = {};
  let api: ReturnType<typeof stubFetch>;
  before(() => {
    api = stubFetch((call) => (call.url.includes('/site-config') ? siteConfig : {}));
  });
  after(() => api.restore());

  const open = () =>
    render(
      <SiteConfigProvider>
        <ScoreboardCheckModal isOpen onClose={() => {}} />
      </SiteConfigProvider>,
      { wrapper: withDictionary() }
    );
  const t = en.scoreboardCheck;
  const pickButton = () => screen.getAllByRole('button').find((b) => b.className.includes('border-dashed')) as HTMLButtonElement;

  it('switched off: says so, and neither picking nor checking a screenshot is possible', async () => {
    siteConfig = { features: { scoreboard_ocr: false } };
    open();
    await waitFor(() => assert.ok(screen.getByText(t.switchedOff)));
    assert.equal(pickButton().disabled, true);
  });

  it('a screenshot over the configured limit is refused, quoting that limit', async () => {
    siteConfig = { features: { scoreboard_ocr: true }, limits: { scoreboard_upload_max_bytes: 2 * 1024 * 1024 } };
    open();
    await waitFor(() => assert.equal(pickButton().disabled, false));
    const big = new File([new Uint8Array(3 * 1024 * 1024)], 'board.png', { type: 'image/png' });
    await act(() => void fireEvent.drop(pickButton(), { dataTransfer: { files: [big] } }));
    assert.ok(screen.getByText(formatMessage(t.tooLarge, { mb: 2 })));
  });

  it('a file that is not an image is refused', async () => {
    siteConfig = { features: { scoreboard_ocr: true } };
    open();
    await waitFor(() => assert.equal(pickButton().disabled, false));
    await act(() => void fireEvent.drop(pickButton(), { dataTransfer: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } }));
    assert.ok(screen.getByText(t.notImage));
  });
});
