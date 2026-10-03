// frontend/src/__tests__/unit/tabs.test.ts
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { Tabs, TabPanel, nextTabIndex, tabId, panelId } from '@/components/common/Tabs';

test('Tabs primitives are exported', () => {
  assert.strictEqual(typeof Tabs, 'function');
  assert.strictEqual(typeof TabPanel, 'function');
  assert.strictEqual(tabId('x', 'a'), 'x-tab-a');
  assert.strictEqual(panelId('x', 'a'), 'x-panel-a');
});

test('nextTabIndex moves and wraps with arrow keys', () => {
  assert.strictEqual(nextTabIndex(0, 'ArrowRight', 3), 1);
  assert.strictEqual(nextTabIndex(2, 'ArrowRight', 3), 0);
  assert.strictEqual(nextTabIndex(0, 'ArrowLeft', 3), 2);
  assert.strictEqual(nextTabIndex(1, 'ArrowLeft', 3), 0);
});

test('nextTabIndex Home/End jump to first/last enabled tab', () => {
  assert.strictEqual(nextTabIndex(1, 'Home', 4), 0);
  assert.strictEqual(nextTabIndex(1, 'End', 4), 3);
  assert.strictEqual(nextTabIndex(2, 'Home', 4, [true, false, false, false]), 1);
  assert.strictEqual(nextTabIndex(1, 'End', 4, [false, false, false, true]), 2);
});

test('nextTabIndex skips disabled tabs', () => {
  assert.strictEqual(nextTabIndex(0, 'ArrowRight', 4, [false, true, true, false]), 3);
  assert.strictEqual(nextTabIndex(0, 'ArrowLeft', 4, [false, true, false, true]), 2);
});

test('nextTabIndex ignores non-navigation keys and empty/all-disabled lists', () => {
  assert.strictEqual(nextTabIndex(0, 'a', 3), -1);
  assert.strictEqual(nextTabIndex(0, 'Enter', 3), -1);
  assert.strictEqual(nextTabIndex(0, 'ArrowRight', 0), -1);
  assert.strictEqual(nextTabIndex(0, 'ArrowRight', 2, [true, true]), -1);
});

test('nextTabIndex uses Up/Down for vertical lists and ignores Left/Right', () => {
  assert.strictEqual(nextTabIndex(0, 'ArrowDown', 3, [], 'vertical'), 1);
  assert.strictEqual(nextTabIndex(0, 'ArrowUp', 3, [], 'vertical'), 2);
  assert.strictEqual(nextTabIndex(0, 'ArrowRight', 3, [], 'vertical'), -1);
});

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

test('no component outside Tabs.tsx hand-rolls role="tab"', () => {
  const root = path.resolve(__dirname, '../..');
  const offenders = walk(root)
    .filter((f) => !f.endsWith(path.join('common', 'Tabs.tsx')) && !f.endsWith('tabs.test.ts'))
    .filter((f) => /role=["']tab(list|panel)?["']/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(root, f));
  assert.deepStrictEqual(offenders, []);
});
