// frontend/src/__tests__/unit/perkPicker.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  isExhaustionPerk,
  isHexOrBoonPerk,
  isMemePerk,
  isPerkBlockedByMutator,
  filterPerksByMutator,
  computeEligiblePool,
  computePlayablePool,
  pickRandomLoadout,
  buildDrawnSlots,
  isHexPerk,
  isBoonPerk,
  isNegativePerk,
  isAuraPerk,
  isGeneratorPerk,
  isHealingPerk,
  isChasePerk,
  isStealthPerk,
  getPerkTarotType,
} from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
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

const noExhaustionMutator: ChaosMutator = {
  id: 'no_exhaustion',
  name: 'No Exhaustion Perks',
  description: '',
  type: 'curse',
  icon: '🚫',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

const hexBoonMutator: ChaosMutator = {
  id: 'hex_boon_only',
  name: 'Hex & Boon Ritual',
  description: '',
  type: 'curse',
  icon: '🔮',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

const memeMutator: ChaosMutator = {
  id: 'meme_loadout',
  name: 'Meme / Off-Meta Loadout',
  description: '',
  type: 'curse',
  icon: '🤡',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

test('isExhaustionPerk: matches known exhaustion perk names case/whitespace-insensitively', () => {
  assert.ok(isExhaustionPerk(makePerk({ name: '  Dead Hard  ' })));
  assert.ok(isExhaustionPerk(makePerk({ name: 'SPRINT BURST' })));
  assert.ok(!isExhaustionPerk(makePerk({ name: 'Iron Will' })));
});

test('isExhaustionPerk: matches perks whose description mentions exhaustion', () => {
  assert.ok(isExhaustionPerk(makePerk({ name: 'Made-Up Perk', description: 'You become Exhausted for 60 seconds.' })));
  assert.ok(isExhaustionPerk(makePerk({ name: 'Made-Up Perk', description: 'Suffer from the Exhaustion status effect.' })));
});

test('isHexOrBoonPerk: matches Hex:/Boon: prefixes in name or description', () => {
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Hex: Ruin' })));
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Boon: Circle of Healing' })));
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Made-Up', description: 'Applies a Hex: effect.' })));
  assert.ok(!isHexOrBoonPerk(makePerk({ name: 'Sprint Burst' })));
});

test('isMemePerk: matches names in the MEME_PERK_NAMES set', () => {
  assert.ok(isMemePerk(makePerk({ name: 'No Mither' })));
  assert.ok(isMemePerk(makePerk({ name: '  Plot Twist  ' })));
  assert.ok(!isMemePerk(makePerk({ name: 'Sprint Burst' })));
});

test('isPerkBlockedByMutator: only no_exhaustion blocks, and only exhaustion perks', () => {
  assert.ok(isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), noExhaustionMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Iron Will' }), noExhaustionMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), hexBoonMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), null));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), undefined));
});

test('filterPerksByMutator: returns all perks unchanged when mutator is null/undefined', () => {
  const perks = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  assert.deepStrictEqual(filterPerksByMutator(perks, null), perks);
  assert.deepStrictEqual(filterPerksByMutator(perks, undefined), perks);
});

test('filterPerksByMutator: no_exhaustion excludes exhaustion perks and keeps the rest', () => {
  const perks = [makePerk({ name: 'Dead Hard' }), makePerk({ name: 'Iron Will' }), makePerk({ name: 'Adrenaline' })];
  const result = filterPerksByMutator(perks, noExhaustionMutator);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].name, 'Iron Will');
});

test('filterPerksByMutator: hex_boon_only keeps only hex/boon perks among the pool', () => {
  const perks = [makePerk({ name: 'Hex: Ruin' }), makePerk({ name: 'Boon: Shadow Step' }), makePerk({ name: 'Iron Will' })];
  const result = filterPerksByMutator(perks, hexBoonMutator);
  assert.strictEqual(result.length, 2);
  assert.ok(result.every((p) => p.name.startsWith('Hex:') || p.name.startsWith('Boon:')));
});

test('filterPerksByMutator: hex_boon_only falls back to the full pool when no hex/boon perks exist', () => {
  const perks = [makePerk({ name: 'Iron Will' }), makePerk({ name: 'Sprint Burst' })];
  const result = filterPerksByMutator(perks, hexBoonMutator);
  assert.deepStrictEqual(result, perks);
});

test('filterPerksByMutator: meme_loadout keeps only meme perks, falling back when none exist', () => {
  const perksWithMeme = [makePerk({ name: 'No Mither' }), makePerk({ name: 'Iron Will' })];
  const resultWith = filterPerksByMutator(perksWithMeme, memeMutator);
  assert.strictEqual(resultWith.length, 1);
  assert.strictEqual(resultWith[0].name, 'No Mither');

  const perksWithoutMeme = [makePerk({ name: 'Iron Will' }), makePerk({ name: 'Sprint Burst' })];
  const resultWithout = filterPerksByMutator(perksWithoutMeme, memeMutator);
  assert.deepStrictEqual(resultWithout, perksWithoutMeme);
});

test('computeEligiblePool: filters by role, excludes unowned perks when logged in, sorts by name', () => {
  const allPerks: Perk[] = [
    makePerk({ name: 'Zebra Perk', category: 'Survivor', character: 'General', is_owned: true }),
    makePerk({ name: 'Alpha Perk', category: 'Survivor', character: 'Meg Thomas', is_owned: true }),
    makePerk({ name: 'Locked Perk', category: 'Survivor', character: 'Meg Thomas', is_owned: false }),
    makePerk({ name: 'Killer Perk', category: 'Killer', character: 'General', is_owned: true }),
  ];

  const result = computeEligiblePool(allPerks, 'Survivor', true);
  const names = result.map((p) => p.name);

  assert.deepStrictEqual(names, ['Alpha Perk', 'Zebra Perk']);
  assert.ok(!names.includes('Locked Perk'), 'unowned perks must be excluded when logged in');
  assert.ok(!names.includes('Killer Perk'), 'wrong-role perks must be excluded');
});

test('computeEligiblePool: does not filter by ownership when not logged in', () => {
  const allPerks: Perk[] = [
    makePerk({ name: 'Locked Perk', category: 'Survivor', character: 'General', is_owned: false }),
  ];
  const result = computeEligiblePool(allPerks, 'Survivor', false);
  assert.strictEqual(result.length, 1);
});

test('computePlayablePool: returns eligible pool unchanged when noRepeatPerks is false', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  assert.deepStrictEqual(computePlayablePool(pool, false, ['A']), pool);
});

test('computePlayablePool: excludes drawn perks when noRepeatPerks is true', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' }), makePerk({ name: 'C' })];
  const result = computePlayablePool(pool, true, ['A', 'C']);
  assert.deepStrictEqual(result.map((p) => p.name), ['B']);
});

test('computePlayablePool: falls back to the full eligible pool once everything has been drawn', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  const result = computePlayablePool(pool, true, ['A', 'B']);
  assert.deepStrictEqual(result, pool);
});

test('pickRandomLoadout: returns `count` distinct perks drawn from the pool', () => {
  const pool = Array.from({ length: 10 }, (_, i) => makePerk({ name: `Perk ${i}` }));
  const picked = pickRandomLoadout(pool, null, 4);
  assert.strictEqual(picked.length, 4);
  const uniqueNames = new Set(picked.map((p) => p.name));
  assert.strictEqual(uniqueNames.size, 4);
  picked.forEach((p) => assert.ok(pool.includes(p)));
});

test('pickRandomLoadout: returns at most pool.length perks when the pool is smaller than count', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  const picked = pickRandomLoadout(pool, null, 4);
  assert.strictEqual(picked.length, 2);
});

test('pickRandomLoadout: respects the active mutator filter before picking', () => {
  const pool = [makePerk({ name: 'Hex: Ruin' }), makePerk({ name: 'Boon: Shadow Step' }), makePerk({ name: 'Iron Will' })];
  const picked = pickRandomLoadout(pool, hexBoonMutator, 4);
  assert.ok(picked.every((p) => p.name.startsWith('Hex:') || p.name.startsWith('Boon:')));
});

test('buildDrawnSlots: computes page/slot coordinates from the perk\'s index in the sorted pool', () => {
  const sortedPool = Array.from({ length: 20 }, (_, i) => makePerk({ name: `Perk ${i}` }));
  const picked = [sortedPool[0], sortedPool[14], sortedPool[15], sortedPool[19]];

  const slots = buildDrawnSlots(picked, sortedPool, 15);

  assert.deepStrictEqual(slots[0], { page: 1, slot: 1, perk: sortedPool[0] });
  assert.deepStrictEqual(slots[1], { page: 1, slot: 15, perk: sortedPool[14] });
  assert.deepStrictEqual(slots[2], { page: 2, slot: 1, perk: sortedPool[15] });
  assert.deepStrictEqual(slots[3], { page: 2, slot: 5, perk: sortedPool[19] });
});

test('buildDrawnSlots: falls back to page 1 / slot 1 for a perk not found in the sorted pool', () => {
  const sortedPool = [makePerk({ name: 'A' })];
  const strayPerk = makePerk({ name: 'Not In Pool' });
  const slots = buildDrawnSlots([strayPerk], sortedPool, 15);
  assert.deepStrictEqual(slots[0], { page: 1, slot: 1, perk: strayPerk });
});

test('isHexPerk / isBoonPerk: split the combined Hex/Boon check by name or description prefix', () => {
  assert.ok(isHexPerk(makePerk({ name: 'Hex: Ruin' })));
  assert.ok(!isBoonPerk(makePerk({ name: 'Hex: Ruin' })));
  assert.ok(isBoonPerk(makePerk({ name: 'Boon: Circle of Healing' })));
  assert.ok(!isHexPerk(makePerk({ name: 'Boon: Circle of Healing' })));
  assert.ok(isHexPerk(makePerk({ name: 'Made-Up', description: 'Applies a Hex: effect.' })));
  assert.ok(!isHexPerk(makePerk({ name: 'Sprint Burst' })));
});

test('isNegativePerk: matches the curated handicap list', () => {
  assert.ok(isNegativePerk(makePerk({ name: 'No Mither' })));
  assert.ok(isNegativePerk(makePerk({ name: '  NO MITHER  ' })));
  assert.ok(!isNegativePerk(makePerk({ name: 'Iron Will' })));
});

test('isAuraPerk / isGeneratorPerk / isHealingPerk / isChasePerk / isStealthPerk: match description keywords across locales', () => {
  assert.ok(isAuraPerk(makePerk({ name: 'Made-Up', description: 'Reveals the Aura of injured Survivors.' })));
  assert.ok(isAuraPerk(makePerk({ name: 'Made-Up', description: 'Ujawnia Aury rannych Ocalałych.' })));
  assert.ok(isGeneratorPerk(makePerk({ name: 'Made-Up', description: 'Repairing Generators is faster.' })));
  assert.ok(isHealingPerk(makePerk({ name: 'Made-Up', description: 'Increases healing speed with a Med-Kit.' })));
  assert.ok(isChasePerk(makePerk({ name: 'Made-Up', description: 'Grants the Haste Status Effect.' })));
  assert.ok(isStealthPerk(makePerk({ name: 'Made-Up', description: 'Your Terror Radius is reduced.' })));
  assert.ok(!isAuraPerk(makePerk({ name: 'Made-Up', description: 'A perk with no matching keyword at all.' })));
});

test('getPerkTarotType: resolves in priority order, Hex/Boon/Sacrifice/Exhaustion before the broader categories', () => {
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Hex: Ruin' })), 'hex');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Boon: Shadow Step' })), 'boon');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'No Mither' })), 'sacrifice');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Dead Hard' })), 'exhaustion');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Related to the Obsession.' })), 'obsession');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Reveals Auras.' })), 'aura');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Repair Generators faster.' })), 'generator');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Heal faster with a Med-Kit.' })), 'healing');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Grants Haste after a hit.' })), 'chase');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Reduces your Terror Radius.' })), 'stealth');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up Perk', description: 'Does something else entirely.' })), 'entity');
});

test('getPerkTarotType: a Hex perk that also mentions Aura in its description still resolves to hex (priority order holds)', () => {
  const perk = makePerk({ name: 'Hex: The Third Seal', description: 'Blinds the Aura of the obsession.' });
  assert.strictEqual(getPerkTarotType(perk), 'hex');
});

const sacrificeMutator: ChaosMutator = {
  id: 'negative_only',
  name: 'Curse of Sacrifice',
  description: '',
  type: 'curse',
  icon: '💀',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

test('filterPerksByMutator: negative_only keeps only negative/handicap perks, falling back when none exist', () => {
  const perksWithNegative = [makePerk({ name: 'No Mither' }), makePerk({ name: 'Iron Will' })];
  const resultWith = filterPerksByMutator(perksWithNegative, sacrificeMutator);
  assert.strictEqual(resultWith.length, 1);
  assert.strictEqual(resultWith[0].name, 'No Mither');

  const perksWithoutNegative = [makePerk({ name: 'Iron Will' }), makePerk({ name: 'Sprint Burst' })];
  const resultWithout = filterPerksByMutator(perksWithoutNegative, sacrificeMutator);
  assert.deepStrictEqual(resultWithout, perksWithoutNegative);
});
