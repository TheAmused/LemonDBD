// frontend/src/__tests__/unit/randomizer/useSlotMachine.test.tsx
//
// A slot-machine spin must finish when its reels land. A regression once dropped the registration of
// the spinning reels, so every landing was ignored: the tick sound never stopped and the machine
// stayed in "spinning" for good (its fallback timer was dead code too, being tied to the same
// registration).
import { act, renderHook, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useSlotMachine } from '@/components/generator/modes/slot-machine/useSlotMachine';
import type { Perk } from '@/types/perks';

const perks: Perk[] = Array.from({ length: 12 }, (_, i) => ({
  name: `Perk ${i + 1}`, character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_types: ['general'],
} as Perk));

const mount = () =>
  renderHook(() => useSlotMachine({ role: 'Survivor', activePlayablePerks: perks, activeMutator: null, onRollComplete: () => {} }), {
    wrapper: withDictionary(),
  });
const landed = { propertyName: 'transform' } as React.TransitionEvent<HTMLDivElement>;

describe('useSlotMachine', () => {
  it('a pull spins every reel, and the spin ends when the last reel reports its landing', () => {
    const { result } = mount();
    act(() => result.current.handlePullLever());
    assert.equal(result.current.phase, 'spinning');
    const ids = result.current.reels.map((r) => r.id);
    assert.equal(result.current.spinningIds.size, ids.length);

    for (const id of ids.slice(0, -1)) act(() => result.current.handleReelTransitionEnd(id, landed));
    assert.equal(result.current.phase, 'spinning', 'still waiting for the last reel');
    act(() => result.current.handleReelTransitionEnd(ids[ids.length - 1], landed));
    assert.equal(result.current.phase, 'awaiting');
    assert.equal(result.current.spinningIds.size, 0);
  });

  it('a transition of another property (opacity, colour) is not a landing', () => {
    const { result } = mount();
    act(() => result.current.handlePullLever());
    for (const reel of result.current.reels) {
      act(() => result.current.handleReelTransitionEnd(reel.id, { propertyName: 'opacity' } as React.TransitionEvent<HTMLDivElement>));
    }
    assert.equal(result.current.phase, 'spinning');
  });

  it('if a landing event never comes, the fallback timer still finishes the spin', async () => {
    const { result } = mount();
    act(() => result.current.handlePullLever());
    // Longest reel: 900 ms + 180 ms per reel after the first, plus a 600 ms grace period.
    await act(() => new Promise((r) => setTimeout(r, 900 + 7 * 180 + 700)));
    assert.equal(result.current.phase, 'awaiting');
  });
});
