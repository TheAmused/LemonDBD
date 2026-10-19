// frontend/src/__tests__/unit/editorSaveIsNewContent.test.ts
//
// Saving from an editor makes new content that belongs to whoever saved it: the editors build the
// saved document from the form alone and never carry over the previous author's stamp
// (`_manifest`). The moderation sweep relies on this: a copy that still carries a stamp was never
// re-saved from an editor, so a ban on the stamped content applies to it (ranking or voting does not
// make content new). If an editor started copying the old stamp, edited content would be purged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');

test('the tier list editor saves without the previous stamp', () => {
  const src = read('components/tier-lists/creator/TierListCreator.tsx');
  assert.ok(!src.includes('_manifest'), 'TierListCreator must not carry a stamp into the saved list');
  assert.ok(!/\.\.\.editingList\b/.test(src), 'the saved list is built from the form, not spread from the old one');
  assert.match(src, /saveCustomList\(\{\s*id: editId,\s*\.\.\.payload,/);
});

test('the roster editor saves without the previous stamp', () => {
  const src = read('components/smash-or-pass/creator/useRosterSubmit.ts');
  assert.ok(!src.includes('_manifest'));
  assert.ok(!/\.\.\.editingRoster\b/.test(src));
  assert.match(src, /saveCustomRoster\(\{ id: editId, \.\.\.result\.doc,/);
});

test('the minigame editor saves without a stamp', () => {
  const src = read('components/minigames/creator/MinigameCreator.tsx');
  const validate = src.slice(src.indexOf('const validateChallenge'), src.indexOf('const handleSaveToMyTrials'));
  assert.ok(validate.length > 0 && !validate.includes('_manifest'), 'the saved trial is built from the form');
});
