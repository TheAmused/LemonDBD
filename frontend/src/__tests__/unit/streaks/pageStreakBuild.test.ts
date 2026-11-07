// frontend/src/__tests__/unit/streaks/pageStreakBuild.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPageStreakBuild,
  pickedPerks,
  readPageStreakBuild,
  serializePageStreakBuild,
  togglePerk,
} from '../../../utils/pageStreakBuild';

const PAGE = ['A', 'B', 'C', 'D', 'E'];

describe('togglePerk', () => {
  it('fills the first empty slot', () => {
    const build = togglePerk(togglePerk(emptyPageStreakBuild(4), 'A'), 'B');
    assert.deepEqual(build.slots, ['A', 'B', null, null]);
  });

  it('empties only the slot of the removed perk, so the others stay where they are', () => {
    let build = emptyPageStreakBuild(4);
    for (const name of ['A', 'B', 'C', 'D']) build = togglePerk(build, name);
    build = togglePerk(build, 'B');
    assert.deepEqual(build.slots, ['A', null, 'C', 'D']);
    assert.deepEqual(pickedPerks(build), ['A', 'C', 'D']);
  });

  it('puts the next pick into the slot that was freed', () => {
    let build = emptyPageStreakBuild(4);
    for (const name of ['A', 'B', 'C', 'D']) build = togglePerk(build, name);
    build = togglePerk(togglePerk(build, 'B'), 'E');
    assert.deepEqual(build.slots, ['A', 'E', 'C', 'D']);
  });

  it('ignores a pick when every slot is taken', () => {
    let build = emptyPageStreakBuild(2);
    for (const name of ['A', 'B', 'C']) build = togglePerk(build, name);
    assert.deepEqual(build.slots, ['A', 'B']);
  });
});

describe('readPageStreakBuild', () => {
  const full = { slots: ['A', 'B', 'C', 'D'], confirmed: true };

  it('restores what was saved for this page and attempt', () => {
    const raw = serializePageStreakBuild('1-1-3-in_progress', full);
    assert.deepEqual(readPageStreakBuild(raw, '1-1-3-in_progress', PAGE, 4), full);
  });

  it('keeps a hole in the slots', () => {
    const partial = { slots: ['A', null, 'C', null], confirmed: false };
    const raw = serializePageStreakBuild('k', partial);
    assert.deepEqual(readPageStreakBuild(raw, 'k', PAGE, 4), partial);
  });

  it('starts empty on another page or attempt', () => {
    const raw = serializePageStreakBuild('1-1-3-in_progress', full);
    assert.deepEqual(readPageStreakBuild(raw, '1-2-1-in_progress', PAGE, 4), emptyPageStreakBuild(4));
  });

  it('starts empty when a saved perk is no longer on the page', () => {
    const raw = serializePageStreakBuild('k', full);
    assert.deepEqual(readPageStreakBuild(raw, 'k', ['A', 'B', 'C', 'X'], 4), emptyPageStreakBuild(4));
  });

  it('never restores a locked build that is not full', () => {
    const raw = JSON.stringify({ key: 'k', slots: ['A', null, 'C', 'D'], confirmed: true });
    assert.equal(readPageStreakBuild(raw, 'k', PAGE, 4).confirmed, false);
  });

  it('survives missing, broken and foreign values', () => {
    const empty = emptyPageStreakBuild(4);
    assert.deepEqual(readPageStreakBuild(null, 'k', PAGE, 4), empty);
    assert.deepEqual(readPageStreakBuild('{nope', 'k', PAGE, 4), empty);
    assert.deepEqual(readPageStreakBuild('42', 'k', PAGE, 4), empty);
    assert.deepEqual(readPageStreakBuild(JSON.stringify({ key: 'k', slots: ['A', 'A', null, null] }), 'k', PAGE, 4), empty);
  });
});
