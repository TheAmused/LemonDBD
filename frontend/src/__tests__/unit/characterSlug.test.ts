// frontend/src/__tests__/unit/characterSlug.test.ts
// Character links use the API's `slug` (from the English name), never the translated `name`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterSlug, getCharacterSlug } from '@/lib/slug';

test('characterSlug prefers the slug the API sends', () => {
  assert.equal(characterSlug({ slug: 'the_trapper', name: 'トラッパー' }), 'the_trapper');
});

test('characterSlug falls back to the name when there is no slug', () => {
  assert.equal(characterSlug({ name: 'The Trapper' }), 'the_trapper');
});

test('getCharacterSlug keeps the URL convention (underscores, no accents)', () => {
  assert.equal(getCharacterSlug('Meg Thomas'), 'meg_thomas');
  assert.equal(getCharacterSlug('The Shape / Michael Myers'), 'the_shape_michael_myers');
  assert.equal(getCharacterSlug('Ji-Woon Hak'), 'ji_woon_hak');
  assert.equal(getCharacterSlug('Élodie Rakoto'), 'elodie_rakoto');
});
