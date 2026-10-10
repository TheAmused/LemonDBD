// frontend/src/__tests__/unit/perkMultiTypeBehaviour.test.ts
//
// A perk can have several types (`perk_types`, primary first). These tests pin
// how that is used: curses match a type anywhere in the list, but a secondary
// match carries only half the effect, and the Tarot Deck deals a secondary type's
// card with half the weight of the primary's.
import test from 'node:test';
import assert from 'node:assert';
import {
  SECONDARY_TYPE_EFFECT,
  getPerkTypes,
  getPerkTarotType,
  pickPerkTarotType,
  getPerkWeight,
  isAuraPerk,
  isChasePerk,
  isExhaustionPerk,
  isGeneratorPerk,
  isHexOrBoonPerk,
  isPerkBlockedByMutator,
  filterPerksByMutator,
} from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(name: string, perk_types?: string[]): Perk {
  return { name, character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_types };
}

function curse(id: string): ChaosMutator {
  return { id, name: id, description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
}

const closeTo = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);

const dejaVu = makePerk('Déjà Vu', ['generator', 'aura']);
const deadHard = makePerk('Dead Hard', ['exhaustion', 'chase']);

test('SECONDARY_TYPE_EFFECT is one half', () => {
  assert.strictEqual(SECONDARY_TYPE_EFFECT, 0.5);
});

test('getPerkTypes: returns the list as sent, and [entity] for a missing or empty one', () => {
  assert.deepStrictEqual([...getPerkTypes(dejaVu)], ['generator', 'aura']);
  assert.deepStrictEqual([...getPerkTypes(makePerk('No List', undefined))], ['entity']);
  assert.deepStrictEqual([...getPerkTypes(makePerk('Empty List', []))], ['entity']);
});

test('category predicates match a type anywhere in the list', () => {
  assert.ok(isGeneratorPerk(dejaVu));
  assert.ok(isAuraPerk(dejaVu));
  assert.ok(!isChasePerk(dejaVu));
  assert.ok(isExhaustionPerk(deadHard));
  assert.ok(isChasePerk(deadHard));
  assert.ok(!isHexOrBoonPerk(deadHard));
});

test('getPerkWeight: a curse aimed at the PRIMARY type applies in full', () => {
  closeTo(getPerkWeight(dejaVu, curse('no_slowdown')), 0.5); // generator is primary, -50%
  closeTo(getPerkWeight(deadHard, curse('no_exhaustion')), 0.5);
  closeTo(getPerkWeight(makePerk('Pure Chase', ['chase']), curse('chase_only')), 1.5);
});

test('getPerkWeight: a curse that only matches a SECONDARY type applies at half effect (x0.75 / x1.25)', () => {
  closeTo(getPerkWeight(dejaVu, curse('blindness')), 0.75); // aura is secondary, -50% -> -25%
  closeTo(getPerkWeight(deadHard, curse('chase_only')), 1.25); // chase is secondary, +50% -> +25%
});

test('getPerkWeight: a perk none of whose types the curse targets is untouched', () => {
  closeTo(getPerkWeight(dejaVu, curse('chase_only')), 1.0);
  closeTo(getPerkWeight(deadHard, curse('blindness')), 1.0);
  closeTo(getPerkWeight(dejaVu, null), 1.0);
});

test('getPerkWeight: matching a curse through several of its categories counts once, at the strongest', () => {
  closeTo(getPerkWeight(makePerk('Hex And Boon', ['hex', 'boon']), curse('hex_roulette')), 1.5);
  closeTo(getPerkWeight(makePerk('Chase Then Hex', ['chase', 'hex']), curse('hex_boon_only')), 1.25);
  closeTo(getPerkWeight(makePerk('Boon Then Chase Then Hex', ['boon', 'chase', 'hex']), curse('hex_boon_only')), 1.5);
});

test('getPerkWeight: legacy alias spellings follow the same primary/secondary rule', () => {
  closeTo(getPerkWeight(makePerk('Old Aura', ['aura_reading']), curse('blindness')), 0.5);
  closeTo(getPerkWeight(makePerk('Old Aura Second', ['chase', 'aura_reading']), curse('blindness')), 0.75);
});

test('hard rules treat a secondary type like any other match: it is still blocked / filtered / kept', () => {
  const chaseWithSlowdown = makePerk('Chase With Slowdown', ['chase', 'generator']);
  assert.ok(isPerkBlockedByMutator(chaseWithSlowdown, curse('no_slowdown')));

  const hexSecond = makePerk('Hex Second', ['chase', 'hex']);
  const plain = makePerk('Plain', ['stealth']);
  assert.deepStrictEqual(filterPerksByMutator([hexSecond, plain], curse('hex_boon_only')), [hexSecond]);
});

test('getPerkTarotType: the primary type, and the first KNOWN type when the primary is not a card', () => {
  assert.strictEqual(getPerkTarotType(dejaVu), 'generator');
  assert.strictEqual(getPerkTarotType(deadHard), 'exhaustion');
  assert.strictEqual(getPerkTarotType(makePerk('Odd First', ['made_up', 'aura'])), 'aura');
  assert.strictEqual(getPerkTarotType(makePerk('Nothing Known', ['made_up'])), 'entity');
  assert.strictEqual(getPerkTarotType(makePerk('No List', undefined)), 'entity');
});

test('pickPerkTarotType: a single-type perk always gets its own card, whatever the dice say', () => {
  const perk = makePerk('Just A Hex', ['hex']);
  for (const roll of [0, 0.3, 0.999999]) assert.strictEqual(pickPerkTarotType(perk, () => roll), 'hex');
  assert.strictEqual(pickPerkTarotType(makePerk('No List', undefined), () => 0.5), 'entity');
});

test('pickPerkTarotType: two types are dealt 2:1 -- the primary up to 2/3, the secondary after', () => {
  assert.strictEqual(pickPerkTarotType(deadHard, () => 0), 'exhaustion');
  assert.strictEqual(pickPerkTarotType(deadHard, () => 0.6666), 'exhaustion');
  assert.strictEqual(pickPerkTarotType(deadHard, () => 0.6667), 'chase');
  assert.strictEqual(pickPerkTarotType(deadHard, () => 0.999999), 'chase');
});

test('pickPerkTarotType: three types are dealt 2:1:1 -- 50% / 25% / 25%', () => {
  const triple = makePerk('Triple', ['aura', 'chase', 'stealth']);
  assert.strictEqual(pickPerkTarotType(triple, () => 0.49), 'aura');
  assert.strictEqual(pickPerkTarotType(triple, () => 0.51), 'chase');
  assert.strictEqual(pickPerkTarotType(triple, () => 0.74), 'chase');
  assert.strictEqual(pickPerkTarotType(triple, () => 0.76), 'stealth');
});

test('pickPerkTarotType: an unknown entry in the list is never dealt, and does not skew the odds of the rest', () => {
  const perk = makePerk('Junk In Between', ['aura', 'made_up', 'chase']);
  assert.strictEqual(pickPerkTarotType(perk, () => 0), 'aura');
  assert.strictEqual(pickPerkTarotType(perk, () => 0.7), 'chase');
});

test('pickPerkTarotType with the real RNG: a two-type perk lands on its secondary card about a third of the time', () => {
  const trials = 20000;
  let secondary = 0;
  for (let i = 0; i < trials; i++) if (pickPerkTarotType(deadHard) === 'chase') secondary++;
  const rate = secondary / trials;
  // Binomial std error at p=1/3 and n=20000 is ~0.33pp; +/-3pp is far outside noise.
  assert.ok(Math.abs(rate - 1 / 3) < 0.03, `secondary rate ${rate.toFixed(4)} not near 0.3333`);
});
