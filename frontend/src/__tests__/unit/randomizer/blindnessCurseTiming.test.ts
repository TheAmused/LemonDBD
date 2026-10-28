// frontend/src/__tests__/unit/randomizer/blindnessCurseTiming.test.ts
//
// getSlotInteraction, the shared mechanism every draw mode's result grid uses to decide whether a
// slot is obscured (Curse of Blindness) or revealed. The timing of the reset on a new roll is tested
// on the rendered stage in instantStageBlindness.test.tsx.
import test from 'node:test';
import assert from 'node:assert';
import { getSlotInteraction } from '@/components/generator/lib/blindnessCurse';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(name = 'Perk'): Perk {
  return { name, character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_types: ['general'] } as Perk;
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
