// frontend/src/__tests__/unit/lastPage.test.ts
// Admin queues step back to the new last page when the last row of a page goes away.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastPage } from '@/constants/pagination';

test('lastPage', () => {
  assert.equal(lastPage(0, 15), 1);
  assert.equal(lastPage(15, 15), 1);
  assert.equal(lastPage(16, 15), 2);
  assert.equal(lastPage(31, 15), 3);
  assert.equal(lastPage(5, 0), 5);
});
