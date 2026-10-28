// frontend/src/__tests__/unit/characters/characterCard.test.tsx
//
// A character tile is a real link to the detail page (keyboard, middle-click, crawlers), or, in
// ownership mode, a real toggle button that reports its state.
import { fireEvent, render, screen, withNextApp } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { CharacterCard } from '@/components/characters/hub/CharacterCard';

const meg = { id: 4, name: 'Meg Thomas', category: 'Survivor' };

function tile(ownershipMode: boolean, isOwned = false, onToggleOwned: (id: number, role: string) => void = () => {}) {
  return render(
    <CharacterCard
      char={meg}
      locale="en"
      backendBase=""
      ownershipMode={ownershipMode}
      isOwned={isOwned}
      perkStats={{ total: 3, unlocked: 0 }}
      onToggleOwned={onToggleOwned}
      onOpenPerks={() => {}}
      onOpenDisabled={() => {}}
    />,
    { wrapper: withNextApp().wrapper }
  );
}

describe('CharacterCard', () => {
  it('is a link to the character page, named after the character', () => {
    tile(false);
    const link = screen.getByRole('link', { name: 'Meg Thomas' }) as HTMLAnchorElement;
    assert.equal(link.getAttribute('href'), '/en/characters/meg_thomas');
  });

  it('in ownership mode it is a toggle button reporting whether the character is owned', () => {
    const toggles: Array<[number, string]> = [];
    tile(true, false, (id, role) => toggles.push([id, role]));
    assert.ok(!screen.queryByRole('link', { name: 'Meg Thomas' }));
    const button = screen.getByRole('button', { name: 'Meg Thomas' });
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    fireEvent.click(button);
    assert.deepEqual(toggles, [[4, 'Survivor']]);
  });

  it('an owned character is shown as pressed', () => {
    tile(true, true);
    assert.equal(screen.getByRole('button', { name: 'Meg Thomas' }).getAttribute('aria-pressed'), 'true');
  });
});
