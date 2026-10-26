// frontend/src/__tests__/unit/streaks/runRequestTracker.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRunRequestTracker } from '../../../components/streaks/runRequestTracker';

function trackerOn(initialScope: string) {
  const tracker = createRunRequestTracker(initialScope);
  return { tracker, moveTo: (next: string) => tracker.setScope(next) };
}

describe('createRunRequestTracker', () => {
  it('lets only the newest request on a channel show its answer', () => {
    const { tracker } = trackerOn('a');
    const older = tracker.begin('run', 'a');
    const newer = tracker.begin('run', 'a');
    assert.equal(older(), false);
    assert.equal(newer(), true);
  });

  it('keeps the channels apart', () => {
    const { tracker } = trackerOn('a');
    const run = tracker.begin('run', 'a');
    tracker.begin('stats', 'a');
    assert.equal(run(), true);
  });

  it('drops an answer for a run the player has left', () => {
    const { tracker, moveTo } = trackerOn('a');
    const load = tracker.begin('run', 'a');
    moveTo('b');
    assert.equal(load(), false);
  });

  it('lets a server answer replace the loads that started before it', () => {
    const { tracker } = trackerOn('a');
    const load = tracker.begin('run', 'a');
    assert.equal(tracker.acceptRunAnswer('a'), true);
    assert.equal(load(), false);
  });

  it('does not let an answer from the old run invalidate the load of the new one', () => {
    const { tracker, moveTo } = trackerOn('a');
    moveTo('b');
    const loadOfB = tracker.begin('run', 'b');
    assert.equal(tracker.acceptRunAnswer('a'), false);
    assert.equal(loadOfB(), true);
  });

  it('refuses a second action on the same run until the first finishes', () => {
    const { tracker } = trackerOn('a');
    assert.equal(tracker.startAction('a'), true);
    assert.equal(tracker.startAction('a'), false);
    tracker.finishAction('a');
    assert.equal(tracker.startAction('a'), true);
  });

  it('does not block another run while an action is in flight', () => {
    const { tracker } = trackerOn('a');
    tracker.startAction('a');
    assert.equal(tracker.startAction('b'), true);
  });

  it('keeps the guard when the player leaves a run and comes back while its action is still running', () => {
    const { tracker, moveTo } = trackerOn('a');
    tracker.startAction('a');
    moveTo('b');
    moveTo('a');
    assert.equal(tracker.startAction('a'), false);
  });
});
