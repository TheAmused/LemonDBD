import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePrivacyLayout } from '@/utils/privacyLayout';

const IDS = ['a', 'b', 'c'] as const;

test('defaults to the given order with nothing hidden', () => {
  assert.deepEqual(normalizePrivacyLayout(null, IDS), { order: ['a', 'b', 'c'], hidden: [] });
});

test('keeps a saved order and appends blocks added later', () => {
  assert.deepEqual(normalizePrivacyLayout({ order: ['c', 'a'], hidden: ['a'] }, IDS), {
    order: ['c', 'a', 'b'],
    hidden: ['a'],
  });
});

test('drops unknown ids, duplicates and junk', () => {
  assert.deepEqual(normalizePrivacyLayout({ order: ['b', 'b', 'zzz', 3], hidden: 'x' }, IDS), {
    order: ['b', 'a', 'c'],
    hidden: [],
  });
});
