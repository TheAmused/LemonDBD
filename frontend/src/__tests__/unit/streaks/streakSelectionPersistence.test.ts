// frontend/src/__tests__/unit/streaks/streakSelectionPersistence.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_HISTORY_PICK, readHistoryPick, serializeHistoryPick } from '../../../utils/historyPick';
import { EMPTY_ID_PLEASE_OPENING, readIdPleaseOpening, serializeIdPleaseOpening } from '../../../utils/idPleaseOpening';

const ROW = ['The Trapper', 'The Wraith', 'The Hillbilly'];

describe('History Streak pick', () => {
  it('gives back what was saved for the same run and row', () => {
    const raw = serializeHistoryPick('1-0-2-5', { selected: 'The Wraith', accepted: 'The Wraith' });
    assert.deepEqual(readHistoryPick(raw, '1-0-2-5', ROW), { selected: 'The Wraith', accepted: 'The Wraith' });
  });

  it('ignores a pick saved for another row or run', () => {
    const raw = serializeHistoryPick('1-0-2-5', { selected: 'The Wraith', accepted: null });
    assert.deepEqual(readHistoryPick(raw, '1-0-3-6', ROW), EMPTY_HISTORY_PICK);
  });

  it('drops a killer that is not in the row any more', () => {
    const raw = serializeHistoryPick('k', { selected: 'The Nurse', accepted: 'The Nurse' });
    assert.deepEqual(readHistoryPick(raw, 'k', ROW), EMPTY_HISTORY_PICK);
  });

  it('starts empty without a saved value or with a broken one', () => {
    assert.deepEqual(readHistoryPick(null, 'k', ROW), EMPTY_HISTORY_PICK);
    assert.deepEqual(readHistoryPick('{not json', 'k', ROW), EMPTY_HISTORY_PICK);
    assert.deepEqual(readHistoryPick('42', 'k', ROW), EMPTY_HISTORY_PICK);
  });
});

describe('ID, Please opening', () => {
  it('gives back the side and the perks saved for the same attempt and roster', () => {
    const raw = serializeIdPleaseOpening('7-1|abc', { side: 'killer', positions: [3, 0, 9] });
    assert.deepEqual(readIdPleaseOpening(raw, '7-1|abc'), { side: 'killer', positions: [3, 0, 9] });
  });

  it('ignores an opening saved for another attempt or for a roster that changed', () => {
    const raw = serializeIdPleaseOpening('7-1|abc', { side: 'killer', positions: [1, 2] });
    assert.deepEqual(readIdPleaseOpening(raw, '7-2|abc'), EMPTY_ID_PLEASE_OPENING);
    assert.deepEqual(readIdPleaseOpening(raw, '7-1|def'), EMPTY_ID_PLEASE_OPENING);
  });

  it('rejects a value that is not a valid opening', () => {
    const bad = (positions: unknown) => JSON.stringify({ key: 'k', side: 'survivor', positions });
    assert.deepEqual(readIdPleaseOpening(bad([1, 2, 3, 4, 5]), 'k'), EMPTY_ID_PLEASE_OPENING);
    assert.deepEqual(readIdPleaseOpening(bad([1, 1]), 'k'), EMPTY_ID_PLEASE_OPENING);
    assert.deepEqual(readIdPleaseOpening(bad([-1]), 'k'), EMPTY_ID_PLEASE_OPENING);
    assert.deepEqual(readIdPleaseOpening(bad(['1']), 'k'), EMPTY_ID_PLEASE_OPENING);
    assert.deepEqual(readIdPleaseOpening(null, 'k'), EMPTY_ID_PLEASE_OPENING);
    assert.deepEqual(readIdPleaseOpening('{not json', 'k'), EMPTY_ID_PLEASE_OPENING);
  });

  it('keeps the perks but forgets an unknown side', () => {
    const raw = JSON.stringify({ key: 'k', side: 'ghost', positions: [2] });
    assert.deepEqual(readIdPleaseOpening(raw, 'k'), { side: null, positions: [2] });
  });
});
