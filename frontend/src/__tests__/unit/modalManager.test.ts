// frontend/src/__tests__/unit/modalManager.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  __resetModalManager,
  acquireScrollLock,
  isTopModal,
  modalDepth,
  pushModal,
  releaseScrollLock,
  removeModal,
  scrollLockCount,
} from '@/components/common/modalManager';

const body = () => ({ style: { overflow: 'auto', paddingRight: '3px' } });

test('modalManager: only the top-most modal is "top"; closing the top promotes the next', () => {
  __resetModalManager();
  pushModal('a');
  pushModal('b');
  assert.ok(isTopModal('b'));
  assert.ok(!isTopModal('a'));
  assert.strictEqual(modalDepth('a'), 0);
  removeModal('b');
  assert.ok(isTopModal('a'));
  pushModal('a'); // idempotent
  assert.strictEqual(modalDepth('a'), 0);
});

test('modalManager: scroll lock is ref-counted and restores the original styles once', () => {
  __resetModalManager();
  const b = body();
  acquireScrollLock(b, 15);
  assert.strictEqual(b.style.overflow, 'hidden');
  assert.strictEqual(b.style.paddingRight, '15px');
  acquireScrollLock(b, 15); // second stacked modal
  releaseScrollLock(b);
  assert.strictEqual(b.style.overflow, 'hidden', 'still locked while one modal is open');
  releaseScrollLock(b);
  assert.strictEqual(b.style.overflow, 'auto');
  assert.strictEqual(b.style.paddingRight, '3px');
  releaseScrollLock(b); // extra release is harmless
  assert.strictEqual(scrollLockCount(), 0);
});
