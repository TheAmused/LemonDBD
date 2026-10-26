// frontend/src/__tests__/unit/smash/turnOnDealbreakerRendering.test.tsx
//
// A roster's own labels for "turn on" and "dealbreaker" (simple mode) reach the lore wings and the
// back of the card, with the character's own answers.
import { render, screen, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { FloatingLoreScattered } from '@/components/smash-or-pass/FloatingLoreScattered';
import { CharacterCard } from '@/components/smash-or-pass/CharacterCard';
import type { EntityItem } from '@/types/smashOrPass';

const sable = {
  id: 'e1', roster_id: 'r1', slug: 'sable_ward', name: 'Sable Ward', role: 'Survivor', gender: 'female',
  metadata: { turn_on: 'Candlelit basements', dealbreaker: 'Sunlight' },
} as unknown as EntityItem;

describe('turn on / dealbreaker', () => {
  it('the lore wings show the answers under the roster\'s own labels', () => {
    render(<FloatingLoreScattered character={sable} customLabels={{ turn_on: 'What Sparks Joy', dealbreaker: 'Hard No' }} />, { wrapper: withDictionary() });
    assert.ok(screen.getByText('Candlelit basements'));
    assert.ok(screen.getByText('Sunlight'));
    assert.ok(screen.getByText(/What Sparks Joy/));
    assert.ok(screen.getByText(/Hard No/));
  });

  it('without custom labels the default ones are used', () => {
    render(<FloatingLoreScattered character={sable} />, { wrapper: withDictionary() });
    assert.ok(screen.getByText('Candlelit basements'));
    assert.ok(!screen.queryByText(/What Sparks Joy/));
    assert.ok(en.smashOrPass);
  });

  it('the back of the card carries them too, with the roster\'s labels', () => {
    render(<CharacterCard character={sable} onVote={() => {}} rosterMode="simple" customLabels={{ turn_on: 'What Sparks Joy', dealbreaker: 'Hard No' }} effects={false} />, {
      wrapper: withDictionary(),
    });
    assert.ok(screen.getAllByText('Candlelit basements').length > 0);
    assert.ok(screen.getAllByText(/What Sparks Joy/).length > 0);
    assert.ok(screen.getAllByText(/Hard No/).length > 0);
  });
});
