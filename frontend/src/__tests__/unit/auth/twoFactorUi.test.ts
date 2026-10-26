// frontend/src/__tests__/unit/auth/twoFactorUi.test.ts
// Static output of the 2FA pieces and the API client. Typing, pasting and the saved-codes gate are
// interaction tests in twoFactorInteraction.test.tsx; session handling is in authSession.test.tsx.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { QrCode } from '@/components/auth/QrCode';
import { CodeInput } from '@/components/auth/CodeInput';
import { RecoveryCodesPanel } from '@/components/user/RecoveryCodesPanel';
import { twoFactorErrorMessage } from '@/utils/twoFactorErrors';
import {
  disableTwoFactor,
  enableTwoFactor,
  fetchTwoFactorStatus,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
} from '@/services/twoFactorApi';
import en from '@/locales/en';

describe('QrCode', () => {
  const uri = 'otpauth://totp/LemonDBD%3Aalice?secret=JBSWY3DPEHPK3PXP&issuer=LemonDBD';
  const html = renderWithDictionary(React.createElement(QrCode, { value: uri, label: 'scan me' }));

  it('is an accessible image drawn locally as SVG', () => {
    assert.match(html, /<svg[^>]*aria-labelledby="([^"]+)"[\s\S]*<title id="\1">scan me<\/title>/);
    assert.match(html, /viewBox="0 0 (\d+) (\d+)"/);
  });

  it('starts with the top-left finder pattern (7 dark modules) inside a 4-module quiet zone', () => {
    assert.match(html, /d="M4 4h7v1h-7z/);
  });

  it('is black on white regardless of theme (scanners need the contrast)', () => {
    assert.match(html, /<rect[^>]*fill="white"/);
    assert.match(html, /<path[^>]*fill="black"/);
  });

  it('encodes different secrets differently and the same secret the same', () => {
    const other = renderWithDictionary(React.createElement(QrCode, { value: uri.replace('JBSW', 'KBSW'), label: 'x' }));
    const again = renderWithDictionary(React.createElement(QrCode, { value: uri, label: 'scan me' }));
    assert.notEqual(other.match(/ d="([^"]+)"/)?.[1], html.match(/ d="([^"]+)"/)?.[1]);
    assert.equal(again, html);
  });

  it('includes explicit dimensions to prevent layout shift and survives empty input', () => {
    assert.match(html, /width="192"/);
    assert.match(html, /height="192"/);
    const empty = renderWithDictionary(React.createElement(QrCode, { value: '', label: 'empty' }));
    assert.match(empty, /<svg[^>]*aria-labelledby=[^>]*>.*<title[^>]*>empty<\/title>/);
  });

});

describe('CodeInput', () => {
  it('renders six one-time-code digit boxes holding the typed digits with numeric pattern', () => {
    const html = renderWithDictionary(React.createElement(CodeInput, { value: '123', onChange: () => {} }));
    assert.equal((html.match(/<input/g) ?? []).length, 6);
    assert.equal((html.match(/autoComplete="one-time-code"|autocomplete="one-time-code"/gi) ?? []).length, 6);
    assert.equal((html.match(/pattern="\[0-9\]\*"/g) ?? []).length, 6);
    assert.deepEqual(
      [...html.matchAll(/value="(\d?)"/g)].map((m) => m[1]),
      ['1', '2', '3', '', '', '']
    );
  });

});

describe('RecoveryCodesPanel', () => {
  const codes = ['ABCDE-12345', 'FGHJK-67890'];
  const html = renderWithDictionary(React.createElement(RecoveryCodesPanel, { codes, onDone: () => {} }));

  it('lists every code and explains they are shown once', () => {
    for (const code of codes) assert.ok(html.includes(`<code>${code}</code>`));
    assert.ok(html.includes(en.twoFactor.codesTitle));
  });

});

describe('twoFactorErrorMessage', () => {
  const t = en.twoFactor;
  it('maps every backend code to its localized message', () => {
    assert.equal(twoFactorErrorMessage(t, 'invalid_two_factor_code'), t.errInvalidCode);
    assert.equal(twoFactorErrorMessage(t, 'two_factor_locked'), t.errLocked);
    assert.equal(twoFactorErrorMessage(t, 'two_factor_challenge_invalid'), t.errChallengeExpired);
    assert.equal(twoFactorErrorMessage(t, 'auth_required'), t.errChallengeExpired);
    assert.equal(twoFactorErrorMessage(t, 'incorrect_password'), t.errIncorrectPassword);
    assert.equal(twoFactorErrorMessage(t, 'two_factor_unavailable'), t.errUnavailable);
  });
  it('falls back to the generic message', () => {
    assert.equal(twoFactorErrorMessage(t, undefined), t.errGeneric);
    assert.equal(twoFactorErrorMessage(t, 'something_new'), t.errGeneric);
  });
});

describe('twoFactorApi', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function mockFetch(status: number, body: object) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    return calls;
  }

  it('sends the session cookie, never caches, and posts JSON to the right endpoints', async () => {
    const calls = mockFetch(200, { secret: 'S', otpauth_uri: 'U', recovery_codes: ['A'], enabled: true });
    await fetchTwoFactorStatus();
    await startTwoFactorSetup('pw');
    assert.deepEqual(await enableTwoFactor('123456'), ['A']);
    await disableTwoFactor('pw', '123456');
    assert.deepEqual(await regenerateRecoveryCodes('pw', 'ABCDE-12345'), ['A']);

    assert.deepEqual(
      calls.map((c) => [c.init.method, c.url.replace(/^.*\/api\/v1\/auth\/two-factor/, '')]),
      [['GET', ''], ['POST', '/setup'], ['POST', '/enable'], ['POST', '/disable'], ['POST', '/recovery-codes']]
    );
    assert.ok(calls.every((c) => c.init.credentials === 'include' && c.init.cache === 'no-store'));
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), { password: 'pw' });
    assert.deepEqual(JSON.parse(String(calls[3].init.body)), { password: 'pw', code: '123456' });
  });

  it('raises an ApiError carrying the backend error_code and maps bare 401 to auth_required', async () => {
    mockFetch(401, { error: 'bad', error_code: 'invalid_two_factor_code' });
    await assert.rejects(enableTwoFactor('000000'), (err: Error & { status?: number; code?: string }) => {
      assert.equal(err.status, 401);
      assert.equal(err.code, 'invalid_two_factor_code');
      return true;
    });
    mockFetch(401, { error: 'Authentication required' });
    await assert.rejects(startTwoFactorSetup('pw'), (err: Error & { status?: number; code?: string }) => {
      assert.equal(err.status, 401);
      assert.equal(err.code, 'auth_required');
      return true;
    });
  });
});
