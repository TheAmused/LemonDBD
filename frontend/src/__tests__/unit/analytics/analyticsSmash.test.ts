// frontend/src/__tests__/unit/analytics/analyticsSmash.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRosterPlayTracker, rosterTag } from '@/utils/smashOrPass/analytics';

describe('rosterTag', () => {
  it('keeps the slug of an official roster', () => {
    assert.equal(rosterTag('canon'), 'canon');
    assert.equal(rosterTag('hooked_on_you'), 'hooked_on_you');
  });

  it('never leaks anything about a custom roster', () => {
    assert.equal(rosterTag('local:abc123'), 'custom');
  });
});

describe('createRosterPlayTracker', () => {
  it('is true once per real slug, so two custom rosters are two plays', () => {
    const first = createRosterPlayTracker();
    assert.equal(first('canon'), true);
    assert.equal(first('canon'), false);
    assert.equal(first('local:a'), true);
    assert.equal(first('local:b'), true);
    assert.equal(first('local:a'), false);
  });
});
