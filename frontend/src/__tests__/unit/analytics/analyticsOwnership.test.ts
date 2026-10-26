// frontend/src/__tests__/unit/analytics/analyticsOwnership.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countChangedPerks } from '@/utils/characterUtils';

describe('countChangedPerks', () => {
  const perks = [
    { perk_id: 1, is_unlocked: true },
    { perk_id: 2, is_unlocked: false },
    { perk_id: 3, is_unlocked: true },
  ];

  it('counts only perks whose draft differs from what was loaded', () => {
    assert.equal(countChangedPerks(perks, { 1: true, 2: true, 3: false }), 2);
  });

  it('is zero when the draft equals the loaded state', () => {
    assert.equal(countChangedPerks(perks, { 1: true, 2: false, 3: true }), 0);
  });

  it('treats a missing draft entry as unchanged', () => {
    assert.equal(countChangedPerks(perks, {}), 0);
  });
});
