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
  getPerkWeight,
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
    perk_type: 'general',
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

test('isExhaustionPerk: driven by perk_type, not perk name', () => {
  assert.ok(isExhaustionPerk(makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' })));
  assert.ok(isExhaustionPerk(makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })));
  assert.ok(!isExhaustionPerk(makePerk({ name: 'Iron Will', perk_type: 'chase' })));
});

test('isExhaustionPerk: a perk whose description merely mentions exhaustion (e.g. removing it) is NOT classified exhaustion unless perk_type says so', () => {
  // Regression test: the old description-keyword matcher false-positived on
  // any mention of "exhausted"/"exhaustion" in the text, including perks
  // that REDUCE existing exhaustion rather than inflict it on their own
  // user. perk_type is the backend's ground truth classification and
  // must be respected even when the description contains those words.
  assert.ok(!isExhaustionPerk(makePerk({ name: 'Vigil', description: 'Lose Exhausted faster.', perk_type: 'general' })));
});

test('isHexOrBoonPerk: driven by perk_type', () => {
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Hex: Ruin', perk_type: 'hex' })));
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Boon: Circle of Healing', perk_type: 'boon' })));
  assert.ok(!isHexOrBoonPerk(makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })));
});

test('isMemePerk: driven by perk_type', () => {
  assert.ok(isMemePerk(makePerk({ name: 'No Mither', perk_type: 'meme' })));
  assert.ok(isMemePerk(makePerk({ name: 'Plot Twist', perk_type: 'meme' })));
  assert.ok(!isMemePerk(makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })));
});

test('isPerkBlockedByMutator: only no_exhaustion blocks, and only exhaustion-category perks', () => {
  assert.ok(isPerkBlockedByMutator(makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' }), noExhaustionMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Iron Will', perk_type: 'chase' }), noExhaustionMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' }), hexBoonMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' }), null));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' }), undefined));
});

test('filterPerksByMutator: returns all perks unchanged when mutator is null/undefined', () => {
  const perks = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  assert.deepStrictEqual(filterPerksByMutator(perks, null), perks);
  assert.deepStrictEqual(filterPerksByMutator(perks, undefined), perks);
});

test('getPerkWeight: assigns lower weight to exhaustion-category perks under no_exhaustion', () => {
  const exhaustionPerk = makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' });
  const standardPerk = makePerk({ name: 'Iron Will', perk_type: 'chase' });
  assert.strictEqual(getPerkWeight(exhaustionPerk, noExhaustionMutator), 0.10);
  assert.strictEqual(getPerkWeight(standardPerk, noExhaustionMutator), 1.0);
});

test('getPerkWeight: assigns lower weight to aura_reading-category perks under blindness', () => {
  const auraPerk = makePerk({ name: 'Bond', perk_type: 'aura_reading' });
  const standardPerk = makePerk({ name: 'Iron Will', perk_type: 'chase' });
  const blindnessMutator: ChaosMutator = {
    id: 'blindness',
    name: 'Curse of Blindness',
    description: '',
    type: 'curse',
    icon: '👁️',
    badgeBg: '',
    borderColor: '',
    textColor: '',
  };
  assert.strictEqual(getPerkWeight(auraPerk, blindnessMutator), 0.15);
  assert.strictEqual(getPerkWeight(standardPerk, blindnessMutator), 1.0);
});

test('filterPerksByMutator: hex_boon_only keeps only hex/boon-category perks among the pool', () => {
  const perks = [
    makePerk({ name: 'Hex: Ruin', perk_type: 'hex' }),
    makePerk({ name: 'Boon: Shadow Step', perk_type: 'boon' }),
    makePerk({ name: 'Iron Will', perk_type: 'chase' }),
  ];
  const result = filterPerksByMutator(perks, hexBoonMutator);
  assert.strictEqual(result.length, 2);
  assert.ok(result.every((p) => p.perk_type === 'hex' || p.perk_type === 'boon'));
});

test('filterPerksByMutator: hex_boon_only falls back to the full pool when no hex/boon perks exist', () => {
  const perks = [makePerk({ name: 'Iron Will', perk_type: 'chase' }), makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })];
  const result = filterPerksByMutator(perks, hexBoonMutator);
  assert.deepStrictEqual(result, perks);
});

test('filterPerksByMutator: meme_loadout keeps only meme-category perks, falling back when none exist', () => {
  const perksWithMeme = [makePerk({ name: 'No Mither', perk_type: 'meme' }), makePerk({ name: 'Iron Will', perk_type: 'chase' })];
  const resultWith = filterPerksByMutator(perksWithMeme, memeMutator);
  assert.strictEqual(resultWith.length, 1);
  assert.strictEqual(resultWith[0].name, 'No Mither');

  const perksWithoutMeme = [makePerk({ name: 'Iron Will', perk_type: 'chase' }), makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })];
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

test('pickRandomLoadout: no_exhaustion is a soft ~90% reduction, not a hard exclude -- exhaustion-category perks stay possible', () => {
  // Regression test for the opposite mistake: no_exhaustion must lower the
  // odds of drawing an exhaustion perk (via getPerkWeight's 0.10 multiplier),
  // not remove them from the pool entirely. Across enough draws from a pool
  // that's mostly exhaustion perks, at least one should still get picked.
  const pool = [
    makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' }),
    makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' }),
    makePerk({ name: 'Balanced Landing', perk_type: 'exhaustion' }),
    makePerk({ name: 'Lithe', perk_type: 'exhaustion' }),
    makePerk({ name: 'Overcome', perk_type: 'exhaustion' }),
    makePerk({ name: 'Iron Will', perk_type: 'chase' }),
  ];

  let sawExhaustionPerk = false;
  for (let i = 0; i < 500; i++) {
    const picked = pickRandomLoadout(pool, noExhaustionMutator, 1);
    if (picked.some((p) => isExhaustionPerk(p))) {
      sawExhaustionPerk = true;
      break;
    }
  }
  assert.ok(
    sawExhaustionPerk,
    'no_exhaustion must still be able to draw an exhaustion perk occasionally -- it reduces the chance, it does not forbid it'
  );
});

test('pickRandomLoadout: soft-boosts hex/boon perks under hex_boon_only WITHOUT excluding every other perk', () => {
  // Regression test for a real bug: pickRandomLoadout used to pre-filter the
  // candidate pool down to ONLY hex/boon perks for "boost" mutators like
  // hex_boon_only, turning an advertised 5x boosted CHANCE into perks of
  // every other type becoming literally impossible to draw. Non-hex/boon
  // perks must still be able to come up -- just less often.
  const pool = [
    makePerk({ name: 'Hex: Ruin', perk_type: 'hex' }),
    makePerk({ name: 'Boon: Shadow Step', perk_type: 'boon' }),
    makePerk({ name: 'Iron Will', perk_type: 'chase' }),
    makePerk({ name: 'Kindred', perk_type: 'aura_reading' }),
    makePerk({ name: 'Spine Chill', perk_type: 'general' }),
    makePerk({ name: 'Windows of Opportunity', perk_type: 'aura_reading' }),
  ];

  let sawNonHexBoonPerk = false;
  for (let i = 0; i < 200; i++) {
    const picked = pickRandomLoadout(pool, hexBoonMutator, 1);
    if (picked.some((p) => p.perk_type !== 'hex' && p.perk_type !== 'boon')) {
      sawNonHexBoonPerk = true;
      break;
    }
  }
  assert.ok(sawNonHexBoonPerk, 'hex_boon_only must still be able to draw non-hex/boon perks -- it boosts odds, it does not exclude');
});

test('pickRandomLoadout: No-Repeat + a curse combine as two hard filters, not a soft blend -- a drawn perk never comes back while No-Repeat is on', () => {
  // No-Repeat is a deliberately hard rule (enforced upstream by the caller
  // passing an already-narrowed pool via computePlayablePool), unlike the
  // Chaos Mutators, which are soft weight adjustments. Simulating that
  // upstream narrowing here: once a hex/boon perk has been "drawn" and
  // removed from the pool passed in, it must NEVER reappear, no matter how
  // many draws happen or how hard Boon Ritual boosts that category.
  const fullPool = [
    makePerk({ name: 'Hex: Ruin', perk_type: 'hex' }),
    makePerk({ name: 'Boon: Shadow Step', perk_type: 'boon' }),
    makePerk({ name: 'Iron Will', perk_type: 'chase' }),
    makePerk({ name: 'Kindred', perk_type: 'aura_reading' }),
  ];
  const drawnNames = new Set(['Hex: Ruin', 'Boon: Shadow Step']);
  const noRepeatPool = fullPool.filter((p) => !drawnNames.has(p.name));

  for (let i = 0; i < 500; i++) {
    const picked = pickRandomLoadout(noRepeatPool, hexBoonMutator, 1);
    assert.ok(
      picked.every((p) => !drawnNames.has(p.name)),
      'a perk excluded by No-Repeat must never be picked, even under a curse that boosts its category'
    );
  }
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

test('isHexPerk / isBoonPerk: split the combined Hex/Boon check by perk_type', () => {
  assert.ok(isHexPerk(makePerk({ name: 'Hex: Ruin', perk_type: 'hex' })));
  assert.ok(!isBoonPerk(makePerk({ name: 'Hex: Ruin', perk_type: 'hex' })));
  assert.ok(isBoonPerk(makePerk({ name: 'Boon: Circle of Healing', perk_type: 'boon' })));
  assert.ok(!isHexPerk(makePerk({ name: 'Boon: Circle of Healing', perk_type: 'boon' })));
  assert.ok(!isHexPerk(makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })));
});

test('isNegativePerk: driven by the handicap perk_type', () => {
  assert.ok(isNegativePerk(makePerk({ name: 'No Mither', perk_type: 'handicap' })));
  assert.ok(!isNegativePerk(makePerk({ name: 'Iron Will', perk_type: 'chase' })));
});

test('isAuraPerk / isGeneratorPerk / isHealingPerk / isChasePerk: driven by perk_type', () => {
  assert.ok(isAuraPerk(makePerk({ name: 'Made-Up', perk_type: 'aura_reading' })));
  assert.ok(isGeneratorPerk(makePerk({ name: 'Made-Up', perk_type: 'gen_slowdown' })));
  assert.ok(isHealingPerk(makePerk({ name: 'Made-Up', perk_type: 'altruism_healing' })));
  assert.ok(isChasePerk(makePerk({ name: 'Made-Up', perk_type: 'chase' })));
  assert.ok(!isAuraPerk(makePerk({ name: 'Made-Up', perk_type: 'general' })));
});

test('isStealthPerk: still keyword-driven (no dedicated perk_type bucket), matches across locales', () => {
  assert.ok(isStealthPerk(makePerk({ name: 'Made-Up', description: 'Your Terror Radius is reduced.' })));
  assert.ok(isStealthPerk(makePerk({ name: 'Made-Up', description: 'Zasięg Terroru jest zmniejszony.' })));
  assert.ok(!isStealthPerk(makePerk({ name: 'Made-Up', description: 'A perk with no matching keyword at all.' })));
});

test('getPerkTarotType: resolves in priority order, Hex/Boon/Sacrifice/Exhaustion before the broader categories', () => {
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Hex: Ruin', perk_type: 'hex' })), 'hex');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Boon: Shadow Step', perk_type: 'boon' })), 'boon');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'No Mither', perk_type: 'handicap' })), 'sacrifice');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Dead Hard', perk_type: 'exhaustion' })), 'exhaustion');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Related to the Obsession.', perk_type: 'general' })), 'obsession');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', perk_type: 'aura_reading' })), 'aura');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', perk_type: 'gen_slowdown' })), 'generator');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', perk_type: 'altruism_healing' })), 'healing');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', perk_type: 'chase' })), 'chase');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Reduces your Terror Radius.', perk_type: 'general' })), 'stealth');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up Perk', description: 'Does something else entirely.', perk_type: 'general' })), 'entity');
});

test('getPerkTarotType: a Hex perk still resolves to hex even if its description happens to mention Aura (priority order holds)', () => {
  const perk = makePerk({ name: 'Hex: The Third Seal', description: 'Blinds the Aura of the obsession.', perk_type: 'hex' });
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

test('filterPerksByMutator: negative_only keeps only handicap-category perks, falling back when none exist', () => {
  const perksWithNegative = [makePerk({ name: 'No Mither', perk_type: 'handicap' }), makePerk({ name: 'Iron Will', perk_type: 'chase' })];
  const resultWith = filterPerksByMutator(perksWithNegative, sacrificeMutator);
  assert.strictEqual(resultWith.length, 1);
  assert.strictEqual(resultWith[0].name, 'No Mither');

  const perksWithoutNegative = [makePerk({ name: 'Iron Will', perk_type: 'chase' }), makePerk({ name: 'Sprint Burst', perk_type: 'exhaustion' })];
  const resultWithout = filterPerksByMutator(perksWithoutNegative, sacrificeMutator);
  assert.deepStrictEqual(resultWithout, perksWithoutNegative);
});
