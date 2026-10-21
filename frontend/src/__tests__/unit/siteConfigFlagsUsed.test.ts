// frontend/src/__tests__/unit/siteConfigFlagsUsed.test.ts
//
// Every flag, limit and link GET /api/v1/site-config sends is there because an admin setting should
// change what the page does. Three of them were parsed and then never read, so switching the setting
// changed nothing in the browser. This keeps each one wired to at least one component.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SITE_CONFIG } from '@/services/siteConfig';
import { parseGoogleConfig } from '@/hooks/useGoogleConfig';
import { mustConfirmEmail } from '@/utils/emailVerification';

const SRC = path.join(process.cwd(), 'src');
const src = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

function appSources(dir = SRC, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'locales') continue;
      appSources(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('public site config', () => {
  const files = appSources()
    .filter((file) => !/services[\\/]siteConfig\.ts$|types[\\/]siteConfig\.ts$/.test(file))
    .map((file) => fs.readFileSync(file, 'utf-8'));

  for (const group of ['features', 'limits', 'links'] as const) {
    for (const key of Object.keys(DEFAULT_SITE_CONFIG[group])) {
      it(`${group}.${key} is read by the app`, () => {
        const pattern = new RegExp(`\\b${key}\\b`);
        assert.ok(files.some((text) => pattern.test(text)), `${group}.${key} is sent by the server but nothing reads it`);
      });
    }
  }
});

describe('Google sign-in switch', () => {
  it('keeps the client id when sign-in is switched off (a Google-only account still confirms with it)', () => {
    assert.deepEqual(parseGoogleConfig({ enabled: false, client_id: 'abc.apps' }), { clientId: 'abc.apps', signInEnabled: false });
    assert.deepEqual(parseGoogleConfig({ enabled: true, client_id: 'abc.apps' }), { clientId: 'abc.apps', signInEnabled: true });
    assert.deepEqual(parseGoogleConfig({ enabled: true, client_id: '' }), { clientId: null, signInEnabled: true });
    assert.deepEqual(parseGoogleConfig(null), { clientId: null, signInEnabled: false });
  });

  it('the sign-in button follows features.googleSignIn; the account-deletion check does not', () => {
    const hook = src('hooks/useGoogleConfig.ts');
    assert.match(hook, /features\.googleSignIn/);
    assert.match(src('components/AuthModal.tsx'), /useGoogleClientId\(isOpen\)/);
    assert.match(src('components/user/DeleteAccountSection.tsx'), /useGoogleClientId\([^)]*'confirm'\)/);
  });
});

describe('e-mail confirmation switch', () => {
  it('an unconfirmed account is held back only while the site requires confirmation', () => {
    assert.equal(mustConfirmEmail({ is_verified: false }, true), true);
    assert.equal(mustConfirmEmail({ is_verified: false }, false), false);
    assert.equal(mustConfirmEmail({ is_verified: true }, true), false);
    assert.equal(mustConfirmEmail(null, true), false);
  });

  it('the challenge pages, ownership edits and the sidebar badge use the same rule', () => {
    for (const file of ['components/streaks/StreaksLayoutShell.tsx', 'components/characters/hub/useCharacterOwnership.ts', 'components/sidebar/SidebarUserSection.tsx']) {
      const text = src(file);
      assert.match(text, /mustConfirmEmail\(user, verificationRequired\)/, file);
      assert.match(text, /features\.emailVerificationRequired/, file);
    }
  });
});

describe('scoreboard OCR switch', () => {
  it('the OCR check says it is switched off and does not upload', () => {
    const modal = src('components/common/ScoreboardCheckModal.tsx');
    assert.match(modal, /!site\.features\.scoreboardOcr/);
    assert.match(modal, /disabled=\{!file \|\| switchedOff\}/);
    assert.match(modal, /t\.switchedOff/);
  });

  it('the "too large" message quotes the configured limit, not a fixed 8 MB', () => {
    for (const locale of ['en', 'pl', 'de', 'es', 'ja']) {
      const text = src(`locales/${locale}/scoreboardCheck.ts`);
      assert.match(text, /"tooLarge": "[^"]*\{mb\}/, locale);
      assert.doesNotMatch(text, /"tooLarge": "[^"]*8\s?MB/, locale);
    }
  });
});
