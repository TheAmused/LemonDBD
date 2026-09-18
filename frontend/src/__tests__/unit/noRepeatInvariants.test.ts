// frontend/src/__tests__/unit/noRepeatInvariants.test.ts
//
// No-Repeat Mode is documented in perkPicker.ts as a HARD rule, always,
// regardless of any active curse -- unlike curse weighting (a soft
// probability), a drawn perk must never come back while No-Repeat is on.
// This file proves that invariant holds under every combination the real
// UI can put it in.
import test from 'node:test';
import assert from 'node:assert';
import { computePlayablePool, pickRandomLoadout } from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(name: string, perk_type = 'general'): Perk {
  return {
    name,
    character: 'General',
    category: 'Survivor',
    description: '',
    icon_url: '',
    icon_local_path: '',
    perk_type,
  } as Perk;
}

function makeMutator(id: string): ChaosMutator {
  return { id, name: id, description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
}

function buildEligiblePool(n: number, targetType = 'exhaustion', nTarget = 0): Perk[] {
  const pool: Perk[] = [];
  for (let i = 0; i < nTarget; i++) pool.push(makePerk(`target-${i}`, targetType));
  for (let i = nTarget; i < n; i++) pool.push(makePerk(`filler-${i}`, 'general'));
  return pool;
}

function longDrawSequence(eligiblePool: Perk[], mutator: ChaosMutator | null, rounds: number): { drawnNames: string[]; everRepeated: boolean } {
  let drawnPerkNames: string[] = [];
  const seen: string[] = [];
  let everRepeated = false;

  for (let round = 0; round < rounds; round++) {
    const playablePool = computePlayablePool(eligiblePool, true, drawnPerkNames);
    const [picked] = pickRandomLoadout(playablePool, mutator, 1);
    if (!picked) continue;
    if (drawnPerkNames.includes(picked.name)) {
      everRepeated = true;
    }
    seen.push(picked.name);
    drawnPerkNames = Array.from(new Set([...drawnPerkNames, picked.name]));
  }
  return { drawnNames: seen, everRepeated };
}

test('No-Repeat + no curse: never repeats across a long draw sequence smaller than the pool', () => {
  const pool = buildEligiblePool(30);
  const { everRepeated, drawnNames } = longDrawSequence(pool, null, 25);
  assert.strictEqual(everRepeated, false);
  assert.strictEqual(new Set(drawnNames).size, drawnNames.length);
});

test('No-Repeat + a reduction curse (no_exhaustion): still never repeats, even though exhaustion perks are rare to draw', () => {
  const pool = buildEligiblePool(30, 'exhaustion', 6);
  const mutator = makeMutator('no_exhaustion');
  const { everRepeated, drawnNames } = longDrawSequence(pool, mutator, 25);
  assert.strictEqual(everRepeated, false);
  assert.strictEqual(new Set(drawnNames).size, drawnNames.length);
});

test('No-Repeat + a boost curse (hex_boon_only): still never repeats, even though hex perks are drawn disproportionately often', () => {
  const pool = buildEligiblePool(30, 'hex', 6);
  const mutator = makeMutator('hex_boon_only');
  const { everRepeated, drawnNames } = longDrawSequence(pool, mutator, 25);
  assert.strictEqual(everRepeated, false);
  assert.strictEqual(new Set(drawnNames).size, drawnNames.length);
});

test('No-Repeat with the eligible pool shrunk to nearly (but not fully) intersecting with drawn perks: the last few remaining perks are still never a repeat', () => {
  const pool = buildEligiblePool(5);
  // Draw 4 of the 5 -- one perk must always remain playable, and it must
  // never be one of the 4 already drawn.
  const { everRepeated, drawnNames } = longDrawSequence(pool, null, 4);
  assert.strictEqual(everRepeated, false);
  assert.strictEqual(new Set(drawnNames).size, 4);

  // The 5th draw: only one perk is left. computePlayablePool must return
  // exactly that one remaining perk, not fall back to the full pool yet
  // (there IS still a non-drawn perk available).
  const playablePool = computePlayablePool(pool, true, drawnNames);
  assert.strictEqual(playablePool.length, 1);
  assert.ok(!drawnNames.includes(playablePool[0].name));
});

test('No-Repeat where the curse-weighted category is ENTIRELY exhausted already: the fallback pool still respects No-Repeat (draws from what remains, never a duplicate) as long as anything remains', () => {
  // All 4 exhaustion perks have already been drawn; 10 filler perks have not.
  const pool = buildEligiblePool(14, 'exhaustion', 4);
  const drawnAlready = pool.filter((p) => p.perk_type === 'exhaustion').map((p) => p.name);
  const mutator = makeMutator('no_exhaustion'); // would otherwise try to avoid exhaustion perks anyway

  const playablePool = computePlayablePool(pool, true, drawnAlready);
  // The exhaustion perks are gone from the playable pool -- not because of
  // the curse, but because No-Repeat already excluded them.
  assert.strictEqual(playablePool.some((p) => p.perk_type === 'exhaustion'), false);
  assert.strictEqual(playablePool.length, 10);

  for (let i = 0; i < 200; i++) {
    const [picked] = pickRandomLoadout(playablePool, mutator, 1);
    assert.ok(picked, 'must still be able to draw something -- 10 filler perks remain');
    assert.ok(!drawnAlready.includes(picked.name), `drew a perk (${picked.name}) that was already in the drawn set -- No-Repeat violated`);
  }
});

test('No-Repeat fully exhausted (every eligible perk already drawn): documented fallback allows repeats rather than returning an empty, unplayable pool -- never crashes, never infinite-loops', () => {
  const pool = buildEligiblePool(6);
  const allNames = pool.map((p) => p.name);

  const playablePool = computePlayablePool(pool, true, allNames);
  // This is the ONE documented exception: when literally nothing is left,
  // computePlayablePool falls back to the full eligible pool (allowing a
  // repeat) rather than returning [] and leaving the UI with nothing to
  // draw at all -- the app surfaces this via the "you're out of perks"
  // warning modal instead of silently breaking the draw.
  assert.strictEqual(playablePool.length, pool.length);

  // Drawing from this fallback pool must still work -- no crash, no
  // infinite loop, always returns something.
  const [picked] = pickRandomLoadout(playablePool, null, 1);
  assert.ok(picked);
});

test('No-Repeat: the "never return empty" fallback in pickRandomLoadout does not itself leak a repeat when the caller correctly narrows the pool first', () => {
  // Regression guard for a subtler failure mode: even if pickRandomLoadout
  // is handed a correctly-narrowed (non-empty) playable pool, it must never
  // reach into perks outside that pool.
  const pool = buildEligiblePool(4);
  const drawnAlready = [pool[0].name, pool[1].name, pool[2].name];
  const playablePool = computePlayablePool(pool, true, drawnAlready);
  assert.strictEqual(playablePool.length, 1);

  for (let i = 0; i < 50; i++) {
    const picked = pickRandomLoadout(playablePool, null, 1)[0];
    assert.strictEqual(picked.name, pool[3].name);
  }
});
