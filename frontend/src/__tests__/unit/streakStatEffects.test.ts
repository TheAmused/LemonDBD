import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveStreakStatEffects, initialRecord } from '../../utils/streakStatEffects';

describe('initialRecord', () => {
  it('is a record when the streak sits on best and is above zero', () => {
    assert.equal(initialRecord({ current: 4, best: 4 }), true);
  });
  it('is not a record at zero or below best', () => {
    assert.equal(initialRecord({ current: 0, best: 0 }), false);
    assert.equal(initialRecord({ current: 2, best: 5 }), false);
  });
});

describe('deriveStreakStatEffects', () => {
  it('first win of a first run raises best and is a record', () => {
    const out = deriveStreakStatEffects({ current: 0, best: 0 }, { current: 1, best: 1 }, false);
    assert.deepEqual(out, { record: true, burst: true, flash: 'record' });
  });

  it('a win below the best is a plain win and not a record', () => {
    const out = deriveStreakStatEffects({ current: 2, best: 5 }, { current: 3, best: 5 }, false);
    assert.deepEqual(out, { record: false, burst: false, flash: 'win' });
  });

  it('a win that only ties the best does not start a record', () => {
    const out = deriveStreakStatEffects({ current: 4, best: 5 }, { current: 5, best: 5 }, false);
    assert.equal(out.record, false);
    assert.equal(out.burst, false);
  });

  it('a win that beats the best starts a record with a burst', () => {
    const out = deriveStreakStatEffects({ current: 5, best: 5 }, { current: 6, best: 6 }, false);
    assert.deepEqual(out, { record: true, burst: true, flash: 'record' });
  });

  it('keeps the record running while the streak stays on best', () => {
    const out = deriveStreakStatEffects({ current: 6, best: 6 }, { current: 7, best: 7 }, true);
    assert.equal(out.record, true);
  });

  it('a loss ends the record and flashes loss', () => {
    const out = deriveStreakStatEffects({ current: 7, best: 7 }, { current: 0, best: 7 }, true);
    assert.deepEqual(out, { record: false, burst: false, flash: 'loss' });
  });

  it('a drop to a checkpoint ends the record', () => {
    const out = deriveStreakStatEffects({ current: 12, best: 12 }, { current: 10, best: 12 }, true);
    assert.equal(out.record, false);
    assert.equal(out.flash, 'loss');
  });

  it('no change triggers nothing', () => {
    const out = deriveStreakStatEffects({ current: 3, best: 3 }, { current: 3, best: 3 }, true);
    assert.deepEqual(out, { record: true, burst: false, flash: null });
  });
});
