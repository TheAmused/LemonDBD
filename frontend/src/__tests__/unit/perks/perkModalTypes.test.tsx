// frontend/src/__tests__/unit/perks/perkModalTypes.test.tsx
//
// The perk modal prints the perk's own types under its description, as plain labels with no heading.
// A perk that came without them (a partial object from a page that did not copy the field) shows none,
// instead of the fallback type the rest of the app uses for unclassified perks.
import { cleanup, render, screen, withDictionary } from '../../helpers/dom';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { PerkModal } from '@/components/PerkModal';
import type { Perk } from '@/types/perks';

afterEach(() => cleanup());

const CALM_SPIRIT: Perk = {
  name: 'Calm Spirit',
  perk_types: ['stealth'],
  character: 'Jake Park',
  category: 'Survivor',
  description: 'Animals do not react to you.',
  icon_url: '',
  icon_local_path: '',
};

const open = (perk: Perk) => render(<PerkModal perk={perk} onClose={() => {}} />, { wrapper: withDictionary() });

describe('perk modal types', () => {
  it('shows the types of the perk, with no heading of their own', () => {
    open(CALM_SPIRIT);
    assert.ok(screen.getByText('Stealth'));
    assert.ok(!screen.queryByText('Perk types'));
  });

  it('shows no type for a perk that came without them, not the fallback one', () => {
    const { perk_types: _dropped, ...bare } = CALM_SPIRIT;
    open(bare);
    assert.ok(!screen.queryByText('Stealth'));
    assert.ok(!screen.queryByText('Entity'));
  });
});
