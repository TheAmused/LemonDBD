// frontend/src/__tests__/unit/backgroundEffects.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundEffectForSegments, DEFAULT_BACKGROUND_EFFECT } from '@/components/layout/backgroundEffects';

describe('backgroundEffectForSegments', () => {
  it('every route uses the campfire default today', () => {
    assert.equal(DEFAULT_BACKGROUND_EFFECT, 'campfire');
    for (const p of [[], ['perks'], ['minigames', 'play'], ['tier-lists', 'custom', 'x'], ['admin'], ['nope']]) {
      assert.equal(backgroundEffectForSegments(p), 'campfire');
    }
  });
});
