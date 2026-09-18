// frontend/src/__tests__/unit/blindnessCurseTiming.test.ts
//
// Two layers: (1) getSlotInteraction, the shared pure-function mechanism
// every draw mode's result grid uses to decide obscured/revealed, and (2)
// a source-level regression guard for the actual timing fix this session
// made in InstantStage.tsx -- a freshly-rolled perk used to flash
// unobscured under Curse of Blindness if the same slot index had been
// revealed on the previous roll, because revealedSlots only reset at
// onRollComplete (several hundred ms after the new perks were already
// decided and rendered). The fix added an `onRollStart` callback that
// resets revealedSlots synchronously, before the new perks are even
// picked. There's no DOM/component-render harness in this repo's test
// setup (plain `node:test`, no jsdom), so the timing-order guarantee is
// verified at the source level: onRollStart must be both present and
// called before the delayed onRollComplete in handleRoll.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getSlotInteraction } from '@/components/generator/lib/blindnessCurse';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(name = 'Perk'): Perk {
  return { name, character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_type: 'general' } as Perk;
}

const blindness: ChaosMutator = { id: 'blindness', name: 'Curse of Blindness', description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
const otherCurse: ChaosMutator = { id: 'no_exhaustion', name: 'No Exhaustion', description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };

test('getSlotInteraction: under blindness, an unrevealed slot with a perk is obscured', () => {
  const perk = makePerk();
  const { isObscured } = getSlotInteraction(0, perk, blindness, [false, false, false, false], () => {}, () => {});
  assert.strictEqual(isObscured, true);
});

test('getSlotInteraction: under blindness, a REVEALED slot is not obscured (the core mechanism the flash bug exploited: stale `true` from a previous roll)', () => {
  const perk = makePerk();
  const { isObscured } = getSlotInteraction(0, perk, blindness, [true, false, false, false], () => {}, () => {});
  assert.strictEqual(isObscured, false);
});

test('getSlotInteraction: resetting revealedSlots to all-false (what onRollStart does) makes every slot obscured again for a fresh roll, even the previously-revealed index', () => {
  const staleRevealedFromPreviousRoll = [true, false, false, false];
  const freshRevealedAfterOnRollStart = staleRevealedFromPreviousRoll.map(() => false);
  const perk = makePerk();

  const withStaleState = getSlotInteraction(0, perk, blindness, staleRevealedFromPreviousRoll, () => {}, () => {});
  const withResetState = getSlotInteraction(0, perk, blindness, freshRevealedAfterOnRollStart, () => {}, () => {});

  assert.strictEqual(withStaleState.isObscured, false, 'stale revealed=true would flash a freshly-drawn perk unobscured');
  assert.strictEqual(withResetState.isObscured, true, 'after the reset, the same slot index must be obscured again');
});

test('getSlotInteraction: no perk in the slot -> never obscured regardless of mutator or revealed state', () => {
  const { isObscured } = getSlotInteraction(0, null, blindness, [false], () => {}, () => {});
  assert.strictEqual(isObscured, false);
});

test('getSlotInteraction: a non-blindness curse never obscures anything', () => {
  const perk = makePerk();
  const { isObscured } = getSlotInteraction(0, perk, otherCurse, [false], () => {}, () => {});
  assert.strictEqual(isObscured, false);
});

test('getSlotInteraction: no active mutator at all never obscures anything', () => {
  const perk = makePerk();
  const { isObscured } = getSlotInteraction(0, perk, null, [false], () => {}, () => {});
  assert.strictEqual(isObscured, false);
});

test('getSlotInteraction: clicking an obscured slot calls onRevealSlot(idx), not onSelectPerk', () => {
  const perk = makePerk();
  let revealedIdx: number | null = null;
  let selectedPerk: Perk | null = null;
  const { onClick } = getSlotInteraction(2, perk, blindness, [false, false, false, false], (i) => { revealedIdx = i; }, (p) => { selectedPerk = p; });
  onClick();
  assert.strictEqual(revealedIdx, 2);
  assert.strictEqual(selectedPerk, null);
});

test('getSlotInteraction: clicking a revealed (or unobscured) slot calls onSelectPerk with the perk, not onRevealSlot', () => {
  const perk = makePerk();
  let revealedIdx: number | null = null;
  let selectedPerk: Perk | null = null;
  const { onClick } = getSlotInteraction(2, perk, blindness, [false, false, true, false], (i) => { revealedIdx = i; }, (p) => { selectedPerk = p; });
  onClick();
  assert.strictEqual(revealedIdx, null);
  assert.strictEqual(selectedPerk, perk);
});

// --- Source-level regression guard for InstantStage's onRollStart fix ---

const INSTANT_STAGE_PATH = path.resolve(__dirname, '../../components/generator/modes/InstantStage.tsx');

test('REGRESSION GUARD: InstantStage.handleRoll calls onRollStart synchronously before the delayed onRollComplete, and before revealSlots are populated with the new draw', () => {
  const src = fs.readFileSync(INSTANT_STAGE_PATH, 'utf-8');
  const handleRollMatch = src.match(/const handleRoll = \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(handleRollMatch, 'could not locate handleRoll in InstantStage.tsx -- source structure changed, update this test');
  const body = handleRollMatch![0];

  const onRollStartIdx = body.indexOf('onRollStart?.()');
  const setRevealSlotsIdx = body.indexOf('setRevealSlots(');
  const onRollCompleteIdx = body.indexOf('onRollComplete(slots)');

  assert.ok(onRollStartIdx !== -1, 'onRollStart?.() call is missing from handleRoll -- the flash-prevention fix regressed');
  assert.ok(setRevealSlotsIdx !== -1 && onRollCompleteIdx !== -1, 'expected handleRoll structure not found');
  assert.ok(
    onRollStartIdx < setRevealSlotsIdx,
    'onRollStart must be called BEFORE the new perks are placed into revealSlots -- otherwise a previously-revealed slot index can flash the new perk unobscured for one render'
  );
  assert.ok(
    onRollCompleteIdx > onRollStartIdx,
    'onRollComplete must still fire after onRollStart (it is the later, delayed reset-plus-commit step, not a replacement for the early one)'
  );
  // onRollComplete is inside a setTimeout in the real source -- confirm
  // that delay still exists, since the whole bug was about the GAP between
  // "perks decided" and "onRollComplete fires" that onRollStart now covers.
  assert.match(body, /window\.setTimeout\(\(\) => \{[\s\S]*onRollComplete\(slots\)/, 'onRollComplete is expected to remain inside the delayed setTimeout -- if it became synchronous, onRollStart may no longer be necessary but this test should be revisited deliberately, not silently pass');
});

test('REGRESSION GUARD: GeneratorPage wires onRollStart into InstantStage to reset revealedSlots (not left unconnected)', () => {
  const generatorPagePath = path.resolve(__dirname, '../../components/generator/GeneratorPage.tsx');
  const src = fs.readFileSync(generatorPagePath, 'utf-8');
  const instantBlockMatch = src.match(/\{genMode === 'instant' && \([\s\S]*?<InstantStage[\s\S]*?\/>\s*\)\}/);
  assert.ok(instantBlockMatch, 'could not locate the InstantStage JSX block in GeneratorPage.tsx');
  assert.match(
    instantBlockMatch![0],
    /onRollStart=\{.*setRevealedSlots/,
    'InstantStage is no longer wired with an onRollStart that resets revealedSlots -- the flash-prevention fix regressed at the call site'
  );
});
