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

test('cn: custom text sizes do not swallow the text color', () => {
  assert.strictEqual(cn('text-accent-amber', 'text-tiny'), 'text-accent-amber text-tiny');
  assert.strictEqual(cn('text-text-secondary', 'sm:text-mini'), 'text-text-secondary sm:text-mini');
  assert.strictEqual(cn('text-micro', 'text-xs'), 'text-xs');
});

test('cn: role radii replace each other and the full radius', () => {
  assert.strictEqual(cn('rounded-control', 'rounded-full'), 'rounded-full');
  assert.strictEqual(cn('rounded-card', 'rounded-chip'), 'rounded-chip');
  assert.strictEqual(cn('rounded-t-modal', 'rounded-t-none'), 'rounded-t-none');
});
