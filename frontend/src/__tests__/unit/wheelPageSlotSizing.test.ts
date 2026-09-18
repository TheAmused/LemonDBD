// frontend/src/__tests__/unit/wheelPageSlotSizing.test.ts
//
// The Wheel's page/slot grid coordinates are derived from buildDrawnSlots,
// which maps a picked perk's index in the sorted pool to a
// {page, slot} pair. This proves that mapping stays correct as pool size
// changes (including sizes that don't divide evenly by perksPerPage), and
// that GeneratorPage's own wheelTotalPages/wheelLastPagePerks formula
// (mirrored here since it's inline, not exported) produces a grid that
// actually has a slot for every perk in the pool -- no perk left off the
// grid, no page with more slots than perksPerPage claims.
import test from 'node:test';
import assert from 'node:assert';
import { buildDrawnSlots, computeEligiblePool } from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';

function makePool(n: number): Perk[] {
  const pool: Perk[] = [];
  for (let i = 0; i < n; i++) {
    // Names padded so localeCompare sorting is stable/predictable (perk-00, perk-01, ...).
    pool.push({
      name: `perk-${String(i).padStart(3, '0')}`,
      character: 'General',
      category: 'Survivor',
      description: '',
      icon_url: '',
      icon_local_path: '',
      perk_type: 'general',
    } as Perk);
  }
  return pool;
}

// Mirrors GeneratorPage.tsx's inline formula exactly (not exported, so
// duplicated here deliberately -- if the real formula changes, this test's
// own local copy needs a matching update, which is the point: it forces a
// conscious decision rather than a silent drift).
function wheelGridFor(poolSize: number, perksPerPage = 15) {
  const totalPages = Math.max(1, Math.ceil(poolSize / perksPerPage));
  const lastPagePerks = poolSize % perksPerPage || (poolSize > 0 ? perksPerPage : 0);
  return { totalPages, lastPagePerks };
}

test('buildDrawnSlots: page/slot coordinates cover every perk in a pool that divides evenly (30 perks, 15 per page -> exactly 2 full pages)', () => {
  const pool = makePool(30);
  const slots = buildDrawnSlots(pool, pool, 15);
  assert.strictEqual(slots[0].page, 1);
  assert.strictEqual(slots[0].slot, 1);
  assert.strictEqual(slots[14].page, 1);
  assert.strictEqual(slots[14].slot, 15);
  assert.strictEqual(slots[15].page, 2);
  assert.strictEqual(slots[15].slot, 1);
  assert.strictEqual(slots[29].page, 2);
  assert.strictEqual(slots[29].slot, 15);
});

test('buildDrawnSlots: a pool size that does NOT divide evenly still places every perk on a valid page/slot', () => {
  const pool = makePool(23); // 15 + 8
  const slots = buildDrawnSlots(pool, pool, 15);
  assert.strictEqual(slots[22].page, 2);
  assert.strictEqual(slots[22].slot, 8);
  // No slot number ever exceeds perksPerPage.
  for (const s of slots) {
    assert.ok(s.slot >= 1 && s.slot <= 15, `slot ${s.slot} out of [1,15] range`);
  }
});

test('wheelTotalPages/wheelLastPagePerks: grid sizing tracks the pool as it shrinks or grows, always giving every perk a slot', () => {
  const sizes = [0, 1, 14, 15, 16, 29, 30, 31, 100];
  for (const size of sizes) {
    const { totalPages, lastPagePerks } = wheelGridFor(size);
    const totalGridCapacity = (totalPages - 1) * 15 + (lastPagePerks || 15);
    if (size === 0) {
      assert.strictEqual(totalPages, 1); // never zero pages, even for an empty pool
      continue;
    }
    assert.ok(totalGridCapacity >= size, `grid capacity ${totalGridCapacity} is smaller than the pool (${size}) -- some perks would have nowhere to render`);
    // And it shouldn't wildly over-allocate either -- at most one extra
    // page's worth of slack (the partially-filled last page).
    assert.ok(totalGridCapacity - size < 15, `grid capacity ${totalGridCapacity} is more than a full page larger than the pool (${size})`);
  }
});

test('buildDrawnSlots: a perk not found in the sorted pool (e.g. stale reference after a role switch) falls back to page 1 / slot 1 rather than throwing or producing a negative index', () => {
  const pool = makePool(5);
  const strayPerk: Perk = { name: 'not-in-pool', character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_type: 'general' } as Perk;
  const slots = buildDrawnSlots([strayPerk], pool, 15);
  assert.strictEqual(slots[0].page, 1);
  assert.strictEqual(slots[0].slot, 1);
});

test('computeEligiblePool + buildDrawnSlots together: sorting by name is exactly what buildDrawnSlots indexes against, so page/slot stays consistent with what the UI actually renders sorted by', () => {
  const unsorted: Perk[] = [
    { name: 'Zebra Perk', character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_type: 'general', is_owned: true } as Perk,
    { name: 'Alpha Perk', character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_type: 'general', is_owned: true } as Perk,
  ];
  const sorted = computeEligiblePool(unsorted, 'Survivor', true);
  assert.strictEqual(sorted[0].name, 'Alpha Perk');
  const slots = buildDrawnSlots([sorted[0]], sorted, 15);
  assert.strictEqual(slots[0].page, 1);
  assert.strictEqual(slots[0].slot, 1); // Alpha Perk is index 0 after sorting
});
