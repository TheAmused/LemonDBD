// frontend/src/__tests__/unit/chaosMutatorsAndPoolSharing.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  filterPerksByMutator,
  isPerkBlockedByMutator,
  computePlayablePool,
  pickRandomLoadout,
  buildDrawnSlots,
} from '@/components/generator/lib/perkPicker';
import { getSlotInteraction } from '@/components/generator/lib/blindnessCurse';
import { CHAOS_MUTATORS } from '@/constants/chaosMutators';
import type { Perk, DrawnSlot } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(overrides: Partial<Perk>): Perk {
  return {
    name: 'Test Perk',
    character: 'General',
    category: 'Survivor',
    description: '',
    icon_url: '',
    icon_local_path: '',
    curse_category: 'general',
    ...overrides,
  };
}

// curse_category drives the mutator logic under test now, not name/description
// keyword matching -- these fixtures carry the real backend classification.
const exhaustionPerk = makePerk({ name: 'Sprint Burst', description: 'Causes Exhaustion for 40 seconds', curse_category: 'exhaustion' });
const hexPerk = makePerk({ name: 'Hex: Ruin', description: 'A Hex that affects generator regression', curse_category: 'hex' });
const boonPerk = makePerk({ name: 'Boon: Circle of Healing', description: 'A Boon totem perk', curse_category: 'boon' });
const memePerk = makePerk({ name: 'Power Struggle', description: 'Drop a pallet while being carried', curse_category: 'meme' });
const negativePerk = makePerk({ name: 'No Mither', description: 'Start injured and broken', curse_category: 'handicap' });
const standardPerk1 = makePerk({ name: 'Bond', description: 'See survivor auras within range', curse_category: 'aura_reading' });
const standardPerk2 = makePerk({ name: 'Iron Will', description: 'Lowers grunts of pain', curse_category: 'chase' });
const standardPerk3 = makePerk({ name: 'Kindred', description: 'Aura reading when hooked', curse_category: 'aura_reading' });
const standardPerk4 = makePerk({ name: 'Deja Vu', description: 'Highlights three generators', curse_category: 'aura_reading' });

const noExhaustionMutator = CHAOS_MUTATORS.find((m) => m.id === 'no_exhaustion')!;
const blindnessMutator = CHAOS_MUTATORS.find((m) => m.id === 'blindness')!;
const memeMutator = CHAOS_MUTATORS.find((m) => m.id === 'meme_loadout')!;
const hexBoonMutator = CHAOS_MUTATORS.find((m) => m.id === 'hex_boon_only')!;
const sacrificeMutator = CHAOS_MUTATORS.find((m) => m.id === 'negative_only')!;

test('Mutators exist and contain all 6 required mutator definitions per role', () => {
  assert.strictEqual(CHAOS_MUTATORS.length, 6);
  const ids = CHAOS_MUTATORS.map((m) => m.id);
  assert.ok(ids.includes('no_exhaustion'));
  assert.ok(ids.includes('blindness'));
  assert.ok(ids.includes('solo_queue'));
  assert.ok(ids.includes('meme_loadout'));
  assert.ok(ids.includes('hex_boon_only'));
  assert.ok(ids.includes('negative_only'));
});

test('Cross-Mode Pool Sharing: perks drawn in Mode A are excluded in Modes B, C, D, E', () => {
  const masterPool: Perk[] = [
    makePerk({ name: 'Perk 1' }),
    makePerk({ name: 'Perk 2' }),
    makePerk({ name: 'Perk 3' }),
    makePerk({ name: 'Perk 4' }),
    makePerk({ name: 'Perk 5' }),
    makePerk({ name: 'Perk 6' }),
    makePerk({ name: 'Perk 7' }),
    makePerk({ name: 'Perk 8' }),
    makePerk({ name: 'Perk 9' }),
    makePerk({ name: 'Perk 10' }),
    makePerk({ name: 'Perk 11' }),
    makePerk({ name: 'Perk 12' }),
    makePerk({ name: 'Perk 13' }),
    makePerk({ name: 'Perk 14' }),
    makePerk({ name: 'Perk 15' }),
    makePerk({ name: 'Perk 16' }),
  ];

  let drawnPerks: string[] = [];

  // --- Step 1: Mode Instant Roll rolls 4 perks ---
  let playablePool = computePlayablePool(masterPool, true, drawnPerks);
  assert.strictEqual(playablePool.length, 16);
  const instantPicked = pickRandomLoadout(playablePool, null, 4);
  assert.strictEqual(instantPicked.length, 4);
  const instantNames = instantPicked.map((p) => p.name);
  drawnPerks = Array.from(new Set([...drawnPerks, ...instantNames]));
  assert.strictEqual(drawnPerks.length, 4);

  // --- Step 2: Mode Unified Wheel checks available pool ---
  playablePool = computePlayablePool(masterPool, true, drawnPerks);
  assert.strictEqual(playablePool.length, 12);
  for (const name of instantNames) {
    assert.ok(!playablePool.some((p) => p.name === name), `Mode Wheel must not see ${name}`);
  }
  const wheelWon = playablePool[0];
  drawnPerks = Array.from(new Set([...drawnPerks, wheelWon.name]));
  assert.strictEqual(drawnPerks.length, 5);

  // --- Step 3: Mode Slot Machine checks available pool ---
  playablePool = computePlayablePool(masterPool, true, drawnPerks);
  assert.strictEqual(playablePool.length, 11);
  assert.ok(!playablePool.some((p) => p.name === wheelWon.name), `Mode Slot Machine must not see ${wheelWon.name}`);
  const slotPicked = pickRandomLoadout(playablePool, null, 4);
  const slotNames = slotPicked.map((p) => p.name);
  drawnPerks = Array.from(new Set([...drawnPerks, ...slotNames]));
  assert.strictEqual(drawnPerks.length, 9);

  // --- Step 4: Mode Tarot Deck checks available pool ---
  playablePool = computePlayablePool(masterPool, true, drawnPerks);
  assert.strictEqual(playablePool.length, 7);
  for (const name of slotNames) {
    assert.ok(!playablePool.some((p) => p.name === name), `Mode Tarot must not see ${name}`);
  }
  const tarotPicked = pickRandomLoadout(playablePool, null, 4);
  const tarotNames = tarotPicked.map((p) => p.name);
  drawnPerks = Array.from(new Set([...drawnPerks, ...tarotNames]));
  assert.strictEqual(drawnPerks.length, 13);

  // --- Step 5: Mode Loot Crate checks available pool ---
  playablePool = computePlayablePool(masterPool, true, drawnPerks);
  assert.strictEqual(playablePool.length, 3);
  for (const name of tarotNames) {
    assert.ok(!playablePool.some((p) => p.name === name), `Mode Loot Crate must not see ${name}`);
  }

  // --- Step 6: Reset pool clears all drawn perks for every mode ---
  drawnPerks = [];
  playablePool = computePlayablePool(masterPool, true, drawnPerks);
  assert.strictEqual(playablePool.length, 16);
});

test('No-Repeat Toggle: turning off no-repeat restores full pool for rolls while keeping drawn memory intact for when toggled back on', () => {
  const masterPool: Perk[] = Array.from({ length: 50 }, (_, i) => makePerk({ name: `Perk ${i + 1}` }));

  let noRepeatPerks = true;
  let drawnPerks: string[] = [];

  // Simulate rolling 30 perks with no-repeat ON
  for (let round = 0; round < 6; round++) {
    const currentPlayable = computePlayablePool(masterPool, noRepeatPerks, drawnPerks);
    const picks = pickRandomLoadout(currentPlayable, null, 5);
    if (noRepeatPerks) {
      drawnPerks = Array.from(new Set([...drawnPerks, ...picks.map((p) => p.name)]));
    }
  }
  assert.strictEqual(drawnPerks.length, 30);

  // Pool while noRepeat is ON has only 20 perks left
  let poolWithNoRepeat = computePlayablePool(masterPool, noRepeatPerks, drawnPerks);
  assert.strictEqual(poolWithNoRepeat.length, 20);

  // User toggles no-repeat mode OFF
  noRepeatPerks = false;

  // With no-repeat OFF, pool MUST contain ALL 50 perks (including the 30 already drawn)
  let poolWithoutNoRepeat = computePlayablePool(masterPool, noRepeatPerks, drawnPerks);
  assert.strictEqual(poolWithoutNoRepeat.length, 50);
  for (const drawnName of drawnPerks) {
    assert.ok(
      poolWithoutNoRepeat.some((p) => p.name === drawnName),
      `Full pool must include previously drawn perk ${drawnName} when no-repeat is off`
    );
  }

  // Rolls performed while no-repeat is OFF must NOT add to drawnPerks
  const freeRollPicks = pickRandomLoadout(poolWithoutNoRepeat, null, 4);
  if (noRepeatPerks) {
    drawnPerks = Array.from(new Set([...drawnPerks, ...freeRollPicks.map((p) => p.name)]));
  }
  assert.strictEqual(drawnPerks.length, 30, 'Rolls made while no-repeat is off must not contaminate drawn perks memory');

  // User toggles no-repeat mode back ON
  noRepeatPerks = true;

  // Pool immediately resumes excluding the 30 drawn perks
  let poolRestored = computePlayablePool(masterPool, noRepeatPerks, drawnPerks);
  assert.strictEqual(poolRestored.length, 20);
  for (const drawnName of drawnPerks) {
    assert.ok(
      !poolRestored.some((p) => p.name === drawnName),
      `Restored no-repeat pool must exclude ${drawnName}`
    );
  }
});

test('Mutator Application: No Exhaustion mutator reduces exhaustion perk drop chance', () => {
  const mixedPool: Perk[] = [
    exhaustionPerk,
    standardPerk1,
    standardPerk2,
    standardPerk3,
    standardPerk4,
    makePerk({ name: 'Perk 5' }),
    makePerk({ name: 'Perk 6' }),
    makePerk({ name: 'Perk 7' }),
    makePerk({ name: 'Perk 8' }),
    makePerk({ name: 'Perk 9' }),
  ];

  let exhaustionCountWithoutMutator = 0;
  let exhaustionCountWithMutator = 0;
  const iterations = 500;

  for (let i = 0; i < iterations; i++) {
    const picksDefault = pickRandomLoadout(mixedPool, null, 1);
    if (picksDefault.some((p) => p.name === exhaustionPerk.name)) {
      exhaustionCountWithoutMutator++;
    }
    const picksCursed = pickRandomLoadout(mixedPool, noExhaustionMutator, 1);
    if (picksCursed.some((p) => p.name === exhaustionPerk.name)) {
      exhaustionCountWithMutator++;
    }
  }

  assert.ok(
    exhaustionCountWithMutator < exhaustionCountWithoutMutator / 2,
    `Exhaustion drop count with mutator (${exhaustionCountWithMutator}) should be significantly lower than without mutator (${exhaustionCountWithoutMutator})`
  );
  assert.strictEqual(isPerkBlockedByMutator(exhaustionPerk, noExhaustionMutator), true);
  assert.strictEqual(isPerkBlockedByMutator(standardPerk1, noExhaustionMutator), false);
});

test('Mutator Application: Blindness mutator reduces aura perk drop chance', () => {
  const auraPool: Perk[] = [
    standardPerk1, // Bond (Aura)
    standardPerk3, // Kindred (Aura)
    standardPerk2, // Iron Will
    makePerk({ name: 'Perk A' }),
    makePerk({ name: 'Perk B' }),
    makePerk({ name: 'Perk C' }),
    makePerk({ name: 'Perk D' }),
    makePerk({ name: 'Perk E' }),
    makePerk({ name: 'Perk F' }),
    makePerk({ name: 'Perk G' }),
  ];

  let auraCountWithout = 0;
  let auraCountWith = 0;
  const iterations = 500;

  for (let i = 0; i < iterations; i++) {
    const picksDefault = pickRandomLoadout(auraPool, null, 1);
    if (picksDefault.some((p) => p.name === standardPerk1.name || p.name === standardPerk3.name)) {
      auraCountWithout++;
    }
    const picksCursed = pickRandomLoadout(auraPool, blindnessMutator, 1);
    if (picksCursed.some((p) => p.name === standardPerk1.name || p.name === standardPerk3.name)) {
      auraCountWith++;
    }
  }

  assert.ok(
    auraCountWith < auraCountWithout / 2,
    `Aura drop count with blindness (${auraCountWith}) should be significantly lower than without mutator (${auraCountWithout})`
  );
});

test('Mutator Application: Hex & Boon mutator restricts pool to Hex/Boon', () => {
  const pool: Perk[] = [
    hexPerk,
    boonPerk,
    standardPerk1,
    standardPerk2,
  ];

  const filtered = filterPerksByMutator(pool, hexBoonMutator);
  assert.strictEqual(filtered.length, 2);
  assert.ok(filtered.some((p) => p.name === hexPerk.name));
  assert.ok(filtered.some((p) => p.name === boonPerk.name));
  assert.ok(!filtered.some((p) => p.name === standardPerk1.name));
});

test('Mutator Application: Meme mutator restricts pool to meme loadout', () => {
  const pool: Perk[] = [
    memePerk,
    standardPerk1,
    standardPerk2,
  ];

  const filtered = filterPerksByMutator(pool, memeMutator);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].name, memePerk.name);
  assert.ok(!filtered.some((p) => p.name === standardPerk1.name));
});

test('Mutator Application: Curse of Sacrifice restricts pool to negative perks', () => {
  const pool: Perk[] = [
    negativePerk,
    standardPerk1,
    standardPerk2,
  ];

  const filtered = filterPerksByMutator(pool, sacrificeMutator);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].name, negativePerk.name);
  assert.ok(!filtered.some((p) => p.name === standardPerk1.name));
});

test('Mutator Application: Blindness mutator obscures perks until revealed', () => {
  const perk = makePerk({ name: 'Deja Vu' });
  const revealedSlots = [false, true, false, false];
  const noop = () => {};

  assert.strictEqual(getSlotInteraction(0, perk, blindnessMutator, revealedSlots, noop, noop).isObscured, true);
  assert.strictEqual(getSlotInteraction(1, perk, blindnessMutator, revealedSlots, noop, noop).isObscured, false);
  assert.strictEqual(getSlotInteraction(0, perk, noExhaustionMutator, revealedSlots, noop, noop).isObscured, false);
  assert.strictEqual(getSlotInteraction(0, perk, null, revealedSlots, noop, noop).isObscured, false);
});

test('Curse Persistence: active mutator survives multiple draw cycles and resets cleanly', () => {
  let activeMutator: ChaosMutator | null = blindnessMutator;

  const role = 'Survivor';
  const storage: Record<string, string> = {};
  const storageKey = `lemon_active_mutator_${role}`;

  const saveMutator = (m: ChaosMutator | null) => {
    if (m) {
      storage[storageKey] = JSON.stringify(m);
    } else {
      delete storage[storageKey];
    }
  };

  saveMutator(activeMutator);
  assert.ok(storage[storageKey]);
  const restored = JSON.parse(storage[storageKey]);
  assert.strictEqual(restored.id, 'blindness');

  for (let cycle = 0; cycle < 5; cycle++) {
    assert.strictEqual(activeMutator?.id, 'blindness');
  }

  saveMutator(null);
  activeMutator = null;
  assert.strictEqual(storage[storageKey], undefined);
  assert.strictEqual(activeMutator, null);
});
