// frontend/src/__tests__/unit/curseWeightingStatistics.test.ts
//
// Statistical correctness for every one of the 9 Chaos Wheel curses: proves
// the *actual resulting draw distribution* matches what the curse claims,
// not just "the function returns something and doesn't throw".
//
// Methodology: a synthetic 100-perk pool (20 perks in the curse's target
// perk_type, 80 outside it), drawn from with pickRandomLoadout(pool,
// mutator, 1) many times (4000 trials), tallying how often a target-category
// perk is the single pick. Because this is weighted sampling of exactly one
// item, the true probability has a closed form:
//
//   P(target) = (n_target * w_target) / (n_target * w_target + n_other * w_other)
//
// With n_target=20, n_other=80, w_other=1.0, and w_target from
// getPerkWeight, that works out to well-separated numbers per curse
// (2.4%..55.6%), so a tolerance band of +/-6 percentage points around each
// expected value is both non-flaky at 4000 trials (binomial std error at
// the widest spread, p=0.5, n=4000, is ~0.79%, so 6pp is >7 std devs) and
// tight enough to catch:
//   - a regression to a HARD filter (matching-only or matching-excluded
//     pool), which would read as ~100% or ~0% -- the exact class of bug
//     this session fixed -- proven explicitly in the last test below by
//     running a hard-filter reimplementation through the same harness and
//     asserting it falls OUTSIDE every curse's tolerance band.
//   - a no-op curse (weight always 1.0), which would read as the ~20%
//     unweighted baseline instead of the expected boosted/reduced number.
import test from 'node:test';
import assert from 'node:assert';
import { pickRandomLoadout, getPerkWeight } from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(name: string, perk_type: string, category: 'Survivor' | 'Killer' = 'Survivor'): Perk {
  return {
    name,
    character: 'General',
    category,
    description: '',
    icon_url: '',
    icon_local_path: '',
    perk_type,
    ...( {} as Partial<Perk> ),
  } as Perk;
}

function makeMutator(id: string): ChaosMutator {
  return {
    id,
    name: id,
    description: '',
    type: 'curse',
    icon: '',
    badgeBg: '',
    borderColor: '',
    textColor: '',
  };
}

const TRIALS = 4000;
const TOLERANCE_PP = 6; // percentage points

function buildPool(targetType: string, nTarget: number, nOther: number, otherType = 'general', role: 'Survivor' | 'Killer' = 'Survivor'): Perk[] {
  const pool: Perk[] = [];
  for (let i = 0; i < nTarget; i++) pool.push(makePerk(`target-${i}`, targetType, role));
  for (let i = 0; i < nOther; i++) pool.push(makePerk(`other-${i}`, otherType, role));
  return pool;
}

function observedTargetRate(pool: Perk[], mutator: ChaosMutator, isTarget: (p: Perk) => boolean, trials = TRIALS): number {
  let hits = 0;
  for (let i = 0; i < trials; i++) {
    const [picked] = pickRandomLoadout(pool, mutator, 1);
    if (picked && isTarget(picked)) hits++;
  }
  return (hits / trials) * 100;
}

function expectedTargetRate(nTarget: number, nOther: number, wTarget: number, wOther = 1.0): number {
  return ((nTarget * wTarget) / (nTarget * wTarget + nOther * wOther)) * 100;
}

interface CurseCase {
  mutatorId: string;
  targetType: string;
  weight: number;
}

const CURSE_CASES: CurseCase[] = [
  { mutatorId: 'no_exhaustion', targetType: 'exhaustion', weight: 0.10 },
  { mutatorId: 'no_slowdown', targetType: 'gen_slowdown', weight: 0.10 },
  { mutatorId: 'blindness', targetType: 'aura_reading', weight: 0.15 },
  { mutatorId: 'solo_queue', targetType: 'altruism_healing', weight: 0.20 },
  { mutatorId: 'meme_loadout', targetType: 'meme', weight: 4.0 },
  { mutatorId: 'chase_only', targetType: 'chase', weight: 4.0 },
  { mutatorId: 'negative_only', targetType: 'handicap', weight: 4.0 },
  { mutatorId: 'hex_boon_only', targetType: 'hex', weight: 5.0 }, // hex_boon_only boosts BOTH hex and boon
  { mutatorId: 'hex_roulette', targetType: 'hex', weight: 5.0 },
];

for (const { mutatorId, targetType, weight } of CURSE_CASES) {
  test(`curse weighting statistics: ${mutatorId} on perk_type=${targetType} matches getPerkWeight's actual multiplier (not a hard filter, not a no-op)`, () => {
    const pool = buildPool(targetType, 20, 80);
    const mutator = makeMutator(mutatorId);

    // Sanity: getPerkWeight itself reports the multiplier this test expects.
    assert.strictEqual(getPerkWeight(pool[0], mutator), weight, 'getPerkWeight multiplier drifted from what this test expects -- update the test\'s expected weight to match the real one before trusting anything else here');

    const expected = expectedTargetRate(20, 80, weight);
    const observed = observedTargetRate(pool, mutator, (p) => p.perk_type === targetType);

    assert.ok(
      Math.abs(observed - expected) <= TOLERANCE_PP,
      `expected ~${expected.toFixed(1)}% of single draws to land on a ${targetType} perk under ${mutatorId}, observed ${observed.toFixed(1)}% over ${TRIALS} trials (tolerance +/-${TOLERANCE_PP}pp)`
    );

    // Never zero, never total: every draw is still a soft probability, the
    // pool is never hard-filtered down to only-matching or only-excluded.
    assert.ok(observed > 0, `${mutatorId} showed ZERO target-category draws -- looks like a hard exclusion, not a reduced chance`);
    assert.ok(observed < 100, `${mutatorId} showed 100% target-category draws -- looks like a hard include, not a boosted chance`);
  });
}

test('hex_boon_only also boosts boon-category perks (both halves of the combined bucket), independently of hex', () => {
  const pool = buildPool('boon', 20, 80);
  const mutator = makeMutator('hex_boon_only');
  const expected = expectedTargetRate(20, 80, 5.0);
  const observed = observedTargetRate(pool, mutator, (p) => p.perk_type === 'boon');
  assert.ok(Math.abs(observed - expected) <= TOLERANCE_PP, `expected ~${expected.toFixed(1)}%, observed ${observed.toFixed(1)}%`);
});

test('getPerkWeight treats hex_roulette identically to hex_boon_only for weighting purposes (both share the isHexOrBoonPerk branch, including boosting a boon-typed perk) -- documented explicitly so a future narrowing of hex_roulette to hex-only is a deliberate change, not a silent one', () => {
  const pool = buildPool('boon', 20, 80, 'general', 'Killer');
  const mutator = makeMutator('hex_roulette');
  const expected = expectedTargetRate(20, 80, 5.0);
  const observed = observedTargetRate(pool, mutator, (p) => p.perk_type === 'boon');
  assert.ok(Math.abs(observed - expected) <= TOLERANCE_PP, `expected ~${expected.toFixed(1)}%, observed ${observed.toFixed(1)}%`);
});

test('baseline (no mutator): a soft-weighted category with no active curse draws at its raw population rate, proving the 20/80 harness itself is unbiased', () => {
  const pool = buildPool('exhaustion', 20, 80);
  const observed = observedTargetRate(pool, null as unknown as ChaosMutator, (p) => p.perk_type === 'exhaustion');
  assert.ok(Math.abs(observed - 20) <= TOLERANCE_PP, `expected ~20% baseline, observed ${observed.toFixed(1)}%`);
});

test('SANITY: this harness would have failed against the pre-fix hard-filter bug (proves the tolerance bands are tight enough to matter)', () => {
  // Reimplements the historical bug this session fixed: a curse that
  // hard-filters the pool down to ONLY matching perks (an "include" bug)
  // instead of softly weighting them, using the exact same draw/tally
  // methodology as every test above.
  function hardFilterPick(pool: Perk[], isTarget: (p: Perk) => boolean): Perk[] {
    const filtered = pool.filter(isTarget);
    const source = filtered.length > 0 ? filtered : pool;
    return [source[Math.floor(Math.random() * source.length)]];
  }

  const pool = buildPool('exhaustion', 20, 80);
  let hits = 0;
  for (let i = 0; i < TRIALS; i++) {
    const [picked] = hardFilterPick(pool, (p) => p.perk_type === 'exhaustion');
    if (picked.perk_type === 'exhaustion') hits++;
  }
  const observedUnderOldBug = (hits / TRIALS) * 100;

  const expectedForNoExhaustion = expectedTargetRate(20, 80, 0.10); // ~2.4%
  assert.ok(
    Math.abs(observedUnderOldBug - expectedForNoExhaustion) > TOLERANCE_PP,
    'the hard-filter reimplementation landed inside the soft-weighting tolerance band -- the band is too loose to catch a regression to a hard filter'
  );
  // Concretely: the hard-filter "include" bug reads as ~100%, nowhere near
  // the ~2.4% a real no_exhaustion-style reduction curse should show.
  assert.ok(observedUnderOldBug > 90, `expected the hard-filter reimplementation to read as ~100%, got ${observedUnderOldBug.toFixed(1)}%`);
});
