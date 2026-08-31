// frontend/src/__tests__/unit/textCase.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { toTitleCase } from '@/utils/textCase';

test('toTitleCase: fixes an all-caps scraper error into title case', () => {
  assert.strictEqual(toTitleCase('PRAYER BEADS'), 'Prayer Beads');
});

test('toTitleCase: leaves an already-correct title untouched', () => {
  assert.strictEqual(toTitleCase("Judith's Tombstone"), "Judith's Tombstone");
});

test('toTitleCase: preserves a short all-caps acronym instead of mangling it', () => {
  assert.strictEqual(toTitleCase('VCR'), 'VCR');
});

test('toTitleCase: preserves a roman numeral token', () => {
  assert.strictEqual(toTitleCase('IRON GRASP III'), 'Iron Grasp III');
});

test('toTitleCase: fixes casing while keeping an apostrophe intact', () => {
  assert.strictEqual(toTitleCase("JUDITH'S TOMBSTONE"), "Judith's Tombstone");
});

test('toTitleCase: leaves an already-correct name containing a short acronym untouched', () => {
  assert.strictEqual(toTitleCase('EMP Device'), 'EMP Device');
});

test('toTitleCase: handles lowercase input', () => {
  assert.strictEqual(toTitleCase('rusty shackles'), 'Rusty Shackles');
});

test('toTitleCase: returns empty/falsy input unchanged', () => {
  assert.strictEqual(toTitleCase(''), '');
});
