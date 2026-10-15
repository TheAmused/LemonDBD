// frontend/src/__tests__/unit/exportRequiresSignature.test.ts
//
// Custom tier lists, rosters and minigames only leave the app signed with the author's account:
// there is no unsigned fallback when signing fails or nobody is signed in.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en, es, pl, de, ja } from '../../locales';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');

test('ExportModal shows nothing exportable until the server has signed the document', () => {
  const src = read('components/common/ExportModal.tsx');
  assert.ok(src.includes('setSignFailed(true)'), 'a failed signature is reported');
  assert.ok(src.includes('dict.tierLists.signFailed'), 'with a translated message');
  assert.ok(!/useState<string>\(\(\) => \(unsignedDoc/.test(src), 'the JSON starts empty, not as the unsigned document');
  assert.ok(!/finalDoc = currentUnsignedDoc/.test(src), 'no unsigned fallback');
});

test('minigame export and share have no unsigned fallback', () => {
  for (const rel of ['components/minigames/creator/MinigameCreator.tsx', 'components/minigames/MinigamesHub.tsx']) {
    const src = read(rel);
    assert.ok(src.includes('dict.tierLists.signFailed'), `${rel}: refuses when signing fails`);
    assert.ok(!/fallback to unsigned|finalDoc = validated;/.test(src), `${rel}: no unsigned fallback`);
  }
});

test('the signing-failed message exists in every locale', () => {
  for (const [loc, dict] of Object.entries({ en, es, pl, de, ja })) {
    assert.ok(dict.tierLists.signFailed.length > 10, `${loc}.tierLists.signFailed`);
  }
});
