// frontend/src/__tests__/unit/editorSaveIsNewContent.test.ts
//
// Saving from an editor makes new content that belongs to whoever saved it: the editors build the
// saved document from the form alone and never carry over the previous author's stamp
// (`_manifest`). The moderation sweep relies on this: a copy that still carries a stamp was never
// re-saved from an editor, so a ban on the stamped content applies to it (ranking or voting does not
// make content new). If an editor started copying the old stamp, edited content would be purged.
//
// The other half of the rule: viewing a list only ranks it. Tiers and items cannot be changed from
// the board, so a list that kept its stamp really is the stamped content, only ranked.
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

test('viewing a tier list only ranks it: no tier or item editing on the board', () => {
  const editor = read('components/tier-lists/TierListEditor.tsx');
  for (const banned of ['TierEditModal', 'canEditTiers', 'onRemoveItem', 'addTier', 'updateTier', 'removeTier', 'reorderTiers']) {
    assert.ok(!editor.includes(banned), `TierListEditor must not offer ${banned}`);
  }
  const board = read('components/tier-lists/TierListBoard.tsx');
  assert.ok(!/onEditTier|onReorderTiers|canEditTiers/.test(board));
  const view = read('components/tier-lists/CustomTierListView.tsx');
  assert.match(view, /\(_tiers: TierDefinition\[\], placements: TierPlacements\) => update\(\{ placements \}\)/);
  assert.ok(!view.includes('onRemoveItem'));
  assert.ok(!view.includes('list?._manifest ?? null'), 'an import never keeps the old stamp on new content');
});
