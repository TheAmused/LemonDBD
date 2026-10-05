// frontend/src/__tests__/unit/challengeCheckpoints.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { everyNthCheckpoint, gauntletCheckpoints, gauntletRunLength } from '../../utils/challengeCheckpoints';

describe('everyNthCheckpoint', () => {
  it('lists multiples below the total', () => {
    assert.deepEqual(everyNthCheckpoint(10, 52), [10, 20, 30, 40, 50]);
  });

  it('leaves out a multiple that equals the total, since the finish is its own trophy', () => {
    assert.deepEqual(everyNthCheckpoint(10, 40), [10, 20, 30]);
  });

  it('returns nothing when the mode has no checkpoints', () => {
    assert.deepEqual(everyNthCheckpoint(0, 52), []);
  });
});

describe('gauntletCheckpoints', () => {
  it('uses every 10 wins for the original mode', () => {
    assert.deepEqual(gauntletCheckpoints('original', 43), [10, 20, 30, 40]);
  });

  it('uses every 5 wins for solo', () => {
    assert.deepEqual(gauntletCheckpoints('lemon_solo', 22), [5, 10, 15, 20]);
  });

  it('uses every 10 wins for the Lemon killer mode, like the original', () => {
    assert.deepEqual(gauntletCheckpoints('lemon_killer', 43), [10, 20, 30, 40]);
  });

  it('uses fixed stage starts for duo and squad, dropping those past the end', () => {
    assert.deepEqual(gauntletCheckpoints('lemon_duo', 26), [6, 12, 18]);
    assert.deepEqual(gauntletCheckpoints('lemon_squad', 10), [6]);
  });
});

describe('gauntletRunLength', () => {
  it('halves the roster for team modes, rounding up', () => {
    assert.equal(gauntletRunLength('lemon_duo', 52), 26);
    assert.equal(gauntletRunLength('lemon_squad', 43), 22);
  });

  it('is the whole roster otherwise', () => {
    assert.equal(gauntletRunLength('original', 52), 52);
    assert.equal(gauntletRunLength('lemon_solo', 52), 52);
  });
});
