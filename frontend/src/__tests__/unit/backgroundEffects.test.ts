// frontend/src/__tests__/unit/backgroundEffects.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundEffectForSegments } from '@/components/layout/backgroundEffects';

describe('backgroundEffectForSegments', () => {
  it('home is fog and only home', () => {
    assert.equal(backgroundEffectForSegments([]), 'fog');
    assert.equal(backgroundEffectForSegments(['achievements']), 'embers');
  });
  it('campfire routes include their sub-routes', () => {
    for (const p of [['perks'], ['minigames', 'play'], ['tier-lists', 'custom', 'x'], ['user'], ['randomizer']]) {
      assert.equal(backgroundEffectForSegments(p), 'campfire');
    }
  });
  it('smash-or-pass hub is embers, create is campfire', () => {
    assert.equal(backgroundEffectForSegments(['smash-or-pass']), 'embers');
    assert.equal(backgroundEffectForSegments(['smash-or-pass', 'create']), 'campfire');
  });
  it('unknown and admin routes fall back to embers', () => {
    assert.equal(backgroundEffectForSegments(['admin']), 'embers');
    assert.equal(backgroundEffectForSegments(['nope']), 'embers');
  });
});
