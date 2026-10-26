// frontend/src/__tests__/unit/randomizer/perkPickerOnCatalogue.test.ts
//
// The client-side randomizer on the real perk catalogue as the API returns it (recorded in
// fixtures/perksApi.json by backend/scripts/record_frontend_fixtures.py). The rules themselves are
// unit-tested on hand-made perks in perks/perkPicker.test.ts; this checks they hold on real data:
// both role pools are large, no-repeat never deals a perk twice, and the mutators find real perks.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDrawnSlots,
  computeEligiblePool,
  computePlayablePool,
  filterPerksByMutator,
  isExhaustionPerk,
  isHexOrBoonPerk,
  pickRandomLoadout,
} from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import recorded from '../../fixtures/perksApi.json';

const catalogue: Perk[] = recorded.data.map((p) => ({
  character: 'General',
  description: '',
  icon_url: '',
  icon_local_path: '',
  ...p,
  category: p.category as Perk['category'],
}));
const survivorPool = computeEligiblePool(catalogue, 'Survivor', false);
const killerPool = computeEligiblePool(catalogue, 'Killer', false);

const mutator = (id: string): ChaosMutator => ({
  id,
  name: id,
  description: '',
  type: 'curse',
  icon: '',
  badgeBg: '',
  borderColor: '',
  textColor: '',
});

describe('perk picker on the recorded catalogue', () => {
  it('splits the catalogue into a survivor and a killer pool, nothing lost', () => {
    assert.ok(survivorPool.length >= 100, `survivor pool: ${survivorPool.length}`);
    assert.ok(killerPool.length >= 100, `killer pool: ${killerPool.length}`);
    assert.equal(survivorPool.length + killerPool.length, catalogue.length);
  });

  it('every perk carries at least one perk type (the picker reads nothing else)', () => {
    const untyped = catalogue.filter((p) => !Array.isArray(p.perk_types) || p.perk_types.length === 0);
    assert.deepEqual(untyped.map((p) => p.name), []);
  });

  it('no-repeat mode deals every survivor perk exactly once, then starts over', () => {
    const drawn: string[] = [];
    while (drawn.length < survivorPool.length) {
      const pool = computePlayablePool(survivorPool, true, drawn);
      assert.equal(pool.length, survivorPool.length - drawn.length);
      const loadout = pickRandomLoadout(pool, null, 4);
      assert.equal(loadout.length, Math.min(4, pool.length));
      for (const perk of loadout) {
        assert.ok(!drawn.includes(perk.name), `${perk.name} dealt twice`);
        drawn.push(perk.name);
      }
    }
    assert.equal(computePlayablePool(survivorPool, true, drawn).length, survivorPool.length, 'an exhausted pool starts over');
    assert.equal(computePlayablePool(survivorPool, false, drawn.slice(0, 8)).length, survivorPool.length, 'no-repeat off ignores the history');
  });

  it('the no-exhaustion curse removes the real exhaustion perks and only those', () => {
    const kept = filterPerksByMutator(survivorPool, mutator('no_exhaustion'));
    const exhaustion = survivorPool.filter(isExhaustionPerk);
    assert.ok(exhaustion.some((p) => p.name === 'Sprint Burst'), 'Sprint Burst is an exhaustion perk');
    assert.equal(kept.length, survivorPool.length - exhaustion.length);
    assert.ok(kept.every((p) => !isExhaustionPerk(p)));
  });

  it('the hex & boon mutator finds the real hex perks for killers', () => {
    const hexes = filterPerksByMutator(killerPool, mutator('hex_boon_only'));
    assert.ok(hexes.some((p) => p.name === 'Hex: Ruin'), 'Hex: Ruin is in the pool');
    assert.ok(hexes.length >= 10, `hex perks: ${hexes.length}`);
    assert.ok(hexes.every(isHexOrBoonPerk));
  });

  it('buildDrawnSlots places picks on 15-perk pages of the alphabetical pool', () => {
    const picks = [killerPool[0], killerPool[14], killerPool[15], killerPool[29]];
    const slots = buildDrawnSlots(picks, killerPool, 15);
    assert.deepEqual(
      slots.map((s) => [s.page, s.slot]),
      [[1, 1], [1, 15], [2, 1], [2, 15]]
    );
  });
});
