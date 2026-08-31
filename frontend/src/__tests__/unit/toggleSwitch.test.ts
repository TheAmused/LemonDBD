// frontend/src/__tests__/unit/toggleSwitch.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { ToggleSwitch, resolveActiveIndex, ToggleSwitchOption } from '@/components/common/ToggleSwitch';

test('ToggleSwitch is properly exported', () => {
  assert.strictEqual(typeof ToggleSwitch, 'function');
  assert.strictEqual(typeof resolveActiveIndex, 'function');
});

test('resolveActiveIndex resolves to the left option (0) when value matches it', () => {
  const options: readonly [ToggleSwitchOption<'a' | 'b'>, ToggleSwitchOption<'a' | 'b'>] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];
  assert.strictEqual(resolveActiveIndex('a', options), 0);
});

test('resolveActiveIndex resolves to the right option (1) when value matches it', () => {
  const options: readonly [ToggleSwitchOption<'a' | 'b'>, ToggleSwitchOption<'a' | 'b'>] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];
  assert.strictEqual(resolveActiveIndex('b', options), 1);
});

test('resolveActiveIndex works for the real Survivor/Killer role pair', () => {
  const options: readonly [ToggleSwitchOption<'Survivor' | 'Killer'>, ToggleSwitchOption<'Survivor' | 'Killer'>] = [
    { value: 'Survivor', label: 'Survivors' },
    { value: 'Killer', label: 'Killers' },
  ];
  assert.strictEqual(resolveActiveIndex('Survivor', options), 0);
  assert.strictEqual(resolveActiveIndex('Killer', options), 1);
});

test('resolveActiveIndex works for the real All/Owned ownership pair', () => {
  const options: readonly [ToggleSwitchOption<'all' | 'owned'>, ToggleSwitchOption<'all' | 'owned'>] = [
    { value: 'all', label: 'All' },
    { value: 'owned', label: 'Owned' },
  ];
  assert.strictEqual(resolveActiveIndex('all', options), 0);
  assert.strictEqual(resolveActiveIndex('owned', options), 1);
});

test('resolveActiveIndex works for the real asc/desc sort-order pair', () => {
  const options: readonly [ToggleSwitchOption<'asc' | 'desc'>, ToggleSwitchOption<'asc' | 'desc'>] = [
    { value: 'asc', label: 'A-Z' },
    { value: 'desc', label: 'Z-A' },
  ];
  assert.strictEqual(resolveActiveIndex('asc', options), 0);
  assert.strictEqual(resolveActiveIndex('desc', options), 1);
});
