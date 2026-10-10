// frontend/src/__tests__/unit/popover.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { computePopoverPosition, popoverTriggerProps } from '@/components/common/Popover';

const VIEWPORT = { width: 800, height: 600 };
const anchorAt = (left: number, top: number, width = 100, height = 30) => ({
  left,
  top,
  width,
  right: left + width,
  bottom: top + height,
});

describe('computePopoverPosition', () => {
  it('opens below the anchor when there is room', () => {
    const p = computePopoverPosition({ anchor: anchorAt(100, 100), panel: { width: 200, height: 150 }, viewport: VIEWPORT, gap: 6, margin: 10 });
    assert.strictEqual(p.side, 'bottom');
    assert.strictEqual(p.top, 136);
    assert.strictEqual(p.left, 100);
  });

  it('flips above when below is too tight and above has more room', () => {
    const p = computePopoverPosition({ anchor: anchorAt(100, 520), panel: { width: 200, height: 200 }, viewport: VIEWPORT, gap: 6, margin: 10 });
    assert.strictEqual(p.side, 'top');
    assert.strictEqual(p.top, 520 - 6 - 200);
  });

  it('does not flip when flip is disabled', () => {
    const p = computePopoverPosition({ anchor: anchorAt(100, 520), panel: { width: 200, height: 200 }, viewport: VIEWPORT, flip: false });
    assert.strictEqual(p.side, 'bottom');
  });

  it('stays below when both sides are tight but below is larger', () => {
    const p = computePopoverPosition({ anchor: anchorAt(0, 100), panel: { width: 100, height: 900 }, viewport: VIEWPORT, gap: 6, margin: 10 });
    assert.strictEqual(p.side, 'bottom');
    assert.strictEqual(p.maxHeight, 600 - 130 - 6 - 10);
  });

  it('caps height at maxHeight but never below minHeight', () => {
    const capped = computePopoverPosition({ anchor: anchorAt(0, 0), panel: { width: 100, height: 500 }, viewport: VIEWPORT, maxHeight: 288 });
    assert.strictEqual(capped.maxHeight, 288);
    const tiny = computePopoverPosition({ anchor: anchorAt(0, 0), panel: { width: 100, height: 500 }, viewport: VIEWPORT, maxHeight: 50, minHeight: 120 });
    assert.strictEqual(tiny.maxHeight, 120);
  });

  it('aligns start / center / end and clamps to the viewport', () => {
    const base = { panel: { width: 200, height: 50 }, viewport: VIEWPORT, margin: 10 };
    assert.strictEqual(computePopoverPosition({ ...base, anchor: anchorAt(300, 100), align: 'start' }).left, 300);
    assert.strictEqual(computePopoverPosition({ ...base, anchor: anchorAt(300, 100), align: 'center' }).left, 300 + 50 - 100);
    assert.strictEqual(computePopoverPosition({ ...base, anchor: anchorAt(300, 100), align: 'end' }).left, 400 - 200);
    assert.strictEqual(computePopoverPosition({ ...base, anchor: anchorAt(-50, 100), align: 'start' }).left, 10);
    assert.strictEqual(computePopoverPosition({ ...base, anchor: anchorAt(780, 100), align: 'start' }).left, 800 - 200 - 10);
  });

  it('matchWidth uses the anchor width', () => {
    const p = computePopoverPosition({ anchor: anchorAt(50, 50, 320), panel: { width: 90, height: 50 }, viewport: VIEWPORT, matchWidth: true });
    assert.strictEqual(p.width, 320);
  });

  it('clamps vertically inside the viewport margin', () => {
    const p = computePopoverPosition({ anchor: anchorAt(0, 5, 100, 10), panel: { width: 50, height: 50 }, viewport: VIEWPORT, placement: 'top', flip: false, margin: 12 });
    assert.strictEqual(p.top, 12);
  });
});

describe('popoverTriggerProps', () => {
  it('wires aria attributes', () => {
    assert.deepStrictEqual(popoverTriggerProps(true, 'listbox', 'x'), { 'aria-haspopup': 'listbox', 'aria-expanded': true, 'aria-controls': 'x' });
    assert.strictEqual(popoverTriggerProps(false, 'menu', 'x')['aria-controls'], undefined);
  });
});

describe('popover migration', () => {
  const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), 'src', rel), 'utf-8');
  const migrated = [
    'components/character-detail/components/CategoryPicker.tsx',
    'components/common/CustomDropdown.tsx',
  ];
  for (const file of migrated) {
    it(`${file} uses Popover and no longer portals itself`, () => {
      const src = read(file);
      assert.ok(!src.includes('createPortal'), 'must not call createPortal');
      assert.ok(!src.includes("from 'react-dom'"), 'must not import react-dom');
      assert.ok(src.includes("@/components/common/Popover"), 'must import the shared Popover');
      assert.ok(src.includes('<Popover'), 'must render <Popover>');
    });
  }

  it('components/streaks/FreezeBadge.tsx uses the shared tooltip and no longer portals itself', () => {
    const src = read('components/streaks/FreezeBadge.tsx');
    assert.ok(!src.includes('createPortal'), 'must not call createPortal');
    assert.ok(!src.includes("from 'react-dom'"), 'must not import react-dom');
    assert.ok(src.includes("@/components/common/Tooltip"), 'must import the shared tooltip');
    assert.ok(src.includes('tip('), 'must spread tip(...) onto the badge');
  });
});
