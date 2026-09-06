import test from 'node:test';
import assert from 'node:assert';
import { Switch } from '@/components/common/Switch';

test('Switch is exported as a function component', () => {
  assert.strictEqual(typeof Switch, 'function');
});
