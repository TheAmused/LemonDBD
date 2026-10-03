// frontend/src/__tests__/unit/i18nFormat.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMessage } from '@/utils/i18nFormat';

const ATTEMPTS = '{count, plural, one {# attempt} other {# attempts}} left';
const PL = '{count, plural, one {# próba} few {# próby} many {# prób} other {# próby}}';

test('simple placeholders', () => {
  assert.equal(formatMessage('Hello {name}, {n}/4', { name: 'Ada', n: 3 }), 'Hello Ada, 3/4');
});

test('unknown placeholders stay visible; empty template is empty', () => {
  assert.equal(formatMessage('Hi {who}', {}), 'Hi {who}');
  assert.equal(formatMessage(undefined, {}), '');
});

test('english one/other', () => {
  assert.equal(formatMessage(ATTEMPTS, { count: 1 }, 'en'), '1 attempt left');
  assert.equal(formatMessage(ATTEMPTS, { count: 3 }, 'en'), '3 attempts left');
  assert.equal(formatMessage(ATTEMPTS, { count: 0 }, 'en'), '0 attempts left');
});

test('polish one/few/many', () => {
  assert.equal(formatMessage(PL, { count: 1 }, 'pl'), '1 próba');
  assert.equal(formatMessage(PL, { count: 2 }, 'pl'), '2 próby');
  assert.equal(formatMessage(PL, { count: 5 }, 'pl'), '5 prób');
  assert.equal(formatMessage(PL, { count: 22 }, 'pl'), '22 próby');
  assert.equal(formatMessage(PL, { count: 12 }, 'pl'), '12 prób');
});

test('japanese has only other; missing branch falls back to other', () => {
  assert.equal(formatMessage('{count, plural, one {# 回} other {# 回}}', { count: 1 }, 'ja'), '1 回');
  assert.equal(formatMessage('{count, plural, other {# x}}', { count: 1 }, 'en'), '1 x');
});

test('exact match branch and nested placeholders', () => {
  const t = '{count, plural, =0 {No {what}} one {# {what}} other {# {what}s}}';
  assert.equal(formatMessage(t, { count: 0, what: 'perk' }, 'en'), 'No perk');
  assert.equal(formatMessage(t, { count: 2, what: 'perk' }, 'en'), '2 perks');
});

test('numbers are locale formatted', () => {
  assert.equal(formatMessage('{count, plural, other {# chars}}', { count: 1234 }, 'en'), '1,234 chars');
});
