// frontend/src/__tests__/unit/safeDecodeParam.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeDecodeParam } from '../../utils/safeDecodeParam';

describe('safeDecodeParam', () => {
  it('decodes a well formed segment', () => {
    assert.equal(safeDecodeParam('The%20Nurse'), 'The Nurse');
    assert.equal(safeDecodeParam('plain'), 'plain');
  });

  it('returns null for a malformed percent sequence instead of throwing', () => {
    assert.equal(safeDecodeParam('%E0%A4%A'), null);
    assert.equal(safeDecodeParam('%'), null);
  });
});
