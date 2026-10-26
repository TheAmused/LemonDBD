// frontend/src/__tests__/guards/contentStamp.test.ts
//
// Saving from an editor makes NEW content that belongs to whoever saved it, so the editors never
// carry over the previous author's stamp (`_manifest`). The moderation sweep relies on this: a copy
// that still carries a stamp was never re-saved from an editor, so a ban on the stamped content
// applies to it. If an editor started copying the old stamp, edited content would be purged.
// (The export side -- nothing leaves the app unsigned -- is tested on the export modal itself.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');

describe('content stamp rule', () => {
  for (const editor of [
    'components/tier-lists/creator/TierListCreator.tsx',
    'components/smash-or-pass/creator/useRosterSubmit.ts',
  ]) {
    it(`${editor} never touches the previous stamp`, () => {
      assert.ok(!read(editor).includes('_manifest'));
    });
  }

  it('the minigame editor builds the saved trial without a stamp', () => {
    const src = read('components/minigames/creator/MinigameCreator.tsx');
    const validate = src.slice(src.indexOf('const validateChallenge'), src.indexOf('const handleSaveToMyTrials'));
    assert.ok(validate.length > 0 && !validate.includes('_manifest'));
  });

  it('importing into a custom tier list never keeps the old stamp on the new content', () => {
    assert.ok(!read('components/tier-lists/CustomTierListView.tsx').includes('list?._manifest ?? null'));
  });

  it('minigame export and share refuse when signing fails (no unsigned fallback)', () => {
    for (const rel of ['components/minigames/creator/MinigameCreator.tsx', 'components/minigames/MinigamesHub.tsx']) {
      const src = read(rel);
      assert.ok(src.includes('dict.tierLists.signFailed'), `${rel}: refuses when signing fails`);
      assert.ok(!/fallback to unsigned|finalDoc = validated;/.test(src), `${rel}: no unsigned fallback`);
    }
  });
});
