// frontend/src/__tests__/unit/randomizer/instantStageBlindness.test.tsx
//
// Curse of Blindness: a freshly rolled perk must never flash unobscured. The bug: a slot revealed
// on the previous roll stayed "revealed" until the new roll completed (several hundred ms after
// the new perks were already on screen). The fix resets the revealed slots the instant a roll
// starts. Rendered with the same state wiring GeneratorPage uses.
import { act, fireEvent, render, screen, withDictionary } from '../../helpers/dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import en from '@/locales/en';
import { InstantStage } from '@/components/generator/modes/InstantStage';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

const blindness: ChaosMutator = { id: 'blindness', name: 'Curse of Blindness', description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
const perks: Perk[] = Array.from({ length: 8 }, (_, i) => ({
  name: `Perk ${i + 1}`, character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_types: ['general'],
} as Perk));

function Harness() {
  const [revealed, setRevealed] = useState([false, false, false, false]);
  return (
    <InstantStage
      role="Survivor"
      activePlayablePerks={perks}
      activeMutator={blindness}
      revealedSlots={revealed}
      onRollStart={() => setRevealed([false, false, false, false])}
      onRollComplete={() => setRevealed([false, false, false, false])}
      onRevealSlot={(idx) => setRevealed((prev) => prev.map((v, i) => (i === idx ? true : v)))}
      onSelectPerk={() => {}}
    />
  );
}

const obscured = () => screen.queryAllByText(en.generator.clickToReveal).length;
const roll = () => act(() => void fireEvent.click(screen.getByRole('button', { name: en.generator.rollCompleteLoadout })));
const settle = () => act(() => new Promise((r) => setTimeout(r, 900)));

test('a new roll hides every slot at once, including one revealed on the previous roll', async () => {
  render(<Harness />, { wrapper: withDictionary() });
  await roll();
  await settle();
  assert.equal(obscured(), 4, 'all four drawn perks start hidden');

  fireEvent.click(screen.getAllByText(en.generator.clickToReveal)[0]);
  assert.equal(obscured(), 3, 'one slot revealed');

  await roll();
  assert.equal(obscured(), 4, 'right after the click, before the roll completes, nothing is visible');
  await settle();
});
