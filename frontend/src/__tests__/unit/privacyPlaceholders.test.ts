import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fillPrivacyPlaceholders, formatWindow, type PrivacyInfo } from '../../utils/privacyPlaceholders';
import { en, es, pl, de, ja } from '../../locales';

const info: PrivacyInfo = {
  contactEmail: 'team@example.com',
  mailProvider: 'Google Gmail',
  verificationSeconds: 24 * 3600,
  resetSeconds: 3600,
  sessionSeconds: 24 * 3600,
  streakPruneSeconds: 90 * 86400,
};

test('formatWindow picks the largest exact unit and localizes it', () => {
  assert.equal(formatWindow(3600, 'en'), '1 hour');
  assert.equal(formatWindow(24 * 3600, 'en'), '1 day');
  assert.equal(formatWindow(36 * 3600, 'en'), '36 hours');
  assert.equal(formatWindow(90 * 86400, 'en'), '90 days');
  assert.equal(formatWindow(45 * 60, 'en'), '45 minutes');
  assert.equal(formatWindow(30, 'en'), '1 minute');
  assert.notEqual(formatWindow(36 * 3600, 'pl'), formatWindow(36 * 3600, 'en'));
});

test('fillPrivacyPlaceholders fills known keys, shows … while loading, keeps unknown braces', () => {
  const text = '{contactEmail} / {mailProvider} / {verificationWindow} / {resetWindow} / {sessionWindow} / {streakPrune} / {other}';
  assert.equal(
    fillPrivacyPlaceholders(text, info, 'en'),
    'team@example.com / Google Gmail / 1 day / 1 hour / 1 day / 90 days / {other}'
  );
  assert.ok(fillPrivacyPlaceholders(text, null, 'en').startsWith('… / … / … / … / … / … /'));
});

test('every locale uses the same placeholders in the policy (nothing hardcoded per language)', () => {
  const collect = (dict: typeof en) =>
    [...new Set(JSON.stringify(dict.privacy).match(/\{\w+\}/g) ?? [])].sort();
  const expected = collect(en);
  assert.deepEqual(expected, [
    '{contactEmail}',
    '{mailProvider}',
    '{resetWindow}',
    '{sessionWindow}',
    '{streakPrune}',
    '{verificationWindow}',
  ]);
  for (const [loc, dict] of Object.entries({ es, pl, de, ja })) {
    assert.deepEqual(collect(dict as unknown as typeof en), expected, `${loc} placeholders`);
  }
});

test('policy text no longer hardcodes the contact address or lifetimes', () => {
  for (const loc of ['en', 'pl', 'de', 'es', 'ja']) {
    const src = fs.readFileSync(path.resolve(__dirname, `../../locales/${loc}/privacy.ts`), 'utf-8');
    assert.ok(!/@gmail\.com|@lemondbd/i.test(src), `${loc}: no hardcoded address`);
  }
});
