// frontend/src/__tests__/unit/perkSlots.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { baseSlots, canAddSlot } from '../../utils/perkSlots';
import type { TierInfo } from '../../types/gauntletStreak';

const tier = (perkLimit: number, randomPerkCount: number): TierInfo => ({
  name: 'Tier',
  tier_level: 0,
  perk_limit: perkLimit,
  character_perks_only: true,
  description: '',
  roster_limit: 43,
  random_perk_count: randomPerkCount,
});

describe('baseSlots', () => {
  it('is the perk limit on a normal tier', () => {
    assert.equal(baseSlots(tier(3, 0)), 3);
  });

  it('counts the dealt perk on a perkless tier', () => {
    assert.equal(baseSlots(tier(0, 1)), 1);
  });

  it('is zero on a perkless tier that deals nothing', () => {
    assert.equal(baseSlots(tier(0, 0)), 0);
  });
});

describe('canAddSlot', () => {
  it('allows one extra slot in the first tier and then stops at four', () => {
    assert.equal(canAddSlot(tier(3, 0), 0, 4), true);
    assert.equal(canAddSlot(tier(3, 0), 1, 4), false);
  });

  it('allows three extra slots on the last tier', () => {
    assert.equal(canAddSlot(tier(0, 1), 2, 4), true);
    assert.equal(canAddSlot(tier(0, 1), 3, 4), false);
  });
});
