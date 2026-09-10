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
    ...overrides,
  };
}

const exhaustionPerk = makePerk({ name: 'Sprint Burst', description: 'Causes Exhaustion for 40 seconds' });
const hexPerk = makePerk({ name: 'Hex: Ruin', description: 'A Hex that affects generator regression' });
const boonPerk = makePerk({ name: 'Boon: Circle of Healing', description: 'A Boon totem perk' });
const memePerk = makePerk({ name: 'Power Struggle', description: 'Drop a pallet while being carried' });
const negativePerk = makePerk({ name: 'No Mither', description: 'Start injured and broken' });
const standardPerk1 = makePerk({ name: 'Bond', description: 'See survivor auras within range' });
const standardPerk2 = makePerk({ name: 'Iron Will', description: 'Lowers grunts of pain' });
const standardPerk3 = makePerk({ name: 'Kindred', description: 'Aura reading when hooked' });
const standardPerk4 = makePerk({ name: 'Deja Vu', description: 'Highlights three generators' });

const noExhaustionMutator = CHAOS_MUTATORS.find((m) => m.id === 'no_exhaustion')!;
const blindnessMutator = CHAOS_MUTATORS.find((m) => m.id === 'blindness')!;
const memeMutator = CHAOS_MUTATORS.find((m) => m.id === 'meme_loadout')!;
const hexBoonMutator = CHAOS_MUTATORS.find((m) => m.id === 'hex_boon_only')!;
const sacrificeMutator = CHAOS_MUTATORS.find((m) => m.id === 'negative_only')!;

test('Mutators exist and contain all 5 required mutator definitions', () => {
  assert.strictEqual(CHAOS_MUTATORS.length, 5);
  const ids = CHAOS_MUTATORS.map((m) => m.id);
  assert.ok(ids.includes('no_exhaustion'));
  assert.ok(ids.includes('blindness'));
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

test('Mutator Application: No Exhaustion mutator works across all roll modes', () => {
  const mixedPool: Perk[] = [
    exhaustionPerk,
    standardPerk1,
    standardPerk2,
    standardPerk3,
    standardPerk4,
  ];

  for (let i = 0; i < 20; i++) {
    const picks = pickRandomLoadout(mixedPool, noExhaustionMutator, 4);
    assert.ok(
      picks.every((p) => p.name !== exhaustionPerk.name),
      'pickRandomLoadout with no_exhaustion must never pick exhaustion perk'
    );
  }

  const filtered = filterPerksByMutator(mixedPool, noExhaustionMutator);
  assert.ok(!filtered.some((p) => p.name === exhaustionPerk.name));
  assert.strictEqual(isPerkBlockedByMutator(exhaustionPerk, noExhaustionMutator), true);
  assert.strictEqual(isPerkBlockedByMutator(standardPerk1, noExhaustionMutator), false);
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
