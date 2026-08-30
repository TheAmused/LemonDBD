// frontend/src/__tests__/unit/cn.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { cn } from '@/utils/cn';

test('cn: merges plain class strings in order', () => {
  assert.strictEqual(cn('a', 'b', 'c'), 'a b c');
});

test('cn: filters out falsy values', () => {
  assert.strictEqual(cn('a', false, undefined, null, '', 'b'), 'a b');
});

test('cn: resolves conflicting tailwind utility classes to the last one', () => {
  assert.strictEqual(cn('px-2 py-1', 'px-4'), 'py-1 px-4');
});

test('cn: supports conditional object syntax', () => {
  assert.strictEqual(cn('base', { active: true, hidden: false }), 'base active');
});
