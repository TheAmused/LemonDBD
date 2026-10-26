// frontend/src/__tests__/unit/shared/download.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { downloadFile } from '@/utils/download';

test('downloadFile is properly exported as a function', () => {
  assert.strictEqual(typeof downloadFile, 'function');
});

test('downloadFile executes safely in Node environment without throwing', () => {
  // In Node environment window is undefined; downloadFile should safely return
  assert.doesNotThrow(() => {
    downloadFile('{"test": true}', 'test.json', 'application/json');
  });
});
