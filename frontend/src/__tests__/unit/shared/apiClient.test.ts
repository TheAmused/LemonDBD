// frontend/src/__tests__/unit/shared/apiClient.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { apiClient, api, DEFAULT_TIMEOUT_MS } from '@/lib/api-client';

test('apiClient and helpers are exported', () => {
  assert.strictEqual(typeof apiClient, 'function');
  assert.strictEqual(typeof api.get, 'function');
  assert.strictEqual(typeof api.post, 'function');
  assert.strictEqual(typeof api.put, 'function');
  assert.strictEqual(typeof api.patch, 'function');
  assert.strictEqual(typeof api.delete, 'function');
  assert.strictEqual(typeof DEFAULT_TIMEOUT_MS, 'number');
  assert.strictEqual(DEFAULT_TIMEOUT_MS > 0, true);
});
