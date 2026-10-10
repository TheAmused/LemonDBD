// frontend/src/components/generator/lib/perkPicker.ts
//
// perk.perk_types is an ordered list of what the perk is for, and its first
// entry IS the Tarot archetype. One source of truth.
// No keyword scanning needed — the backend seed data classifies every perk
// with 1-3 of: hex | boon | sacrifice | exhaustion | obsession |
// aura | generator | healing | chase | stealth | entity | hooks
// (`entity` is the catch-all and only ever appears alone).
//
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';

const FALLBACK_PERK_TYPES: readonly string[] = ['entity'];

/**
 * Every type a perk has, primary first. A perk with no list at all (stale
 * cached data, an old API response) or an empty one is treated as ['entity'].
 */
export function getPerkTypes(perk: Perk): readonly string[] {
  const types = perk.perk_types;
  return Array.isArray(types) && types.length > 0 ? types : FALLBACK_PERK_TYPES;
}

/**
 * All classification below reads directly from `perk.perk_types` (set by the
 * backend seed, using Tarot archetype values). A perk matches a category if
 * the category is ANYWHERE in its list, so a perk that is both a generator and
 * an aura perk is hit by a curse aimed at either. No description-keyword
 * matching, no hardcoded name lists -- the backend is the single source of
 * truth.
 */
function hasPerkType(perk: Perk, type: string): boolean {
  return getPerkTypes(perk).includes(type);
}

/**
 * The relative weight of a secondary type (every entry of `perk_types` after
 * the first) against the primary type's 1.0. It is used in two places:
 *
 * - Chaos Mutators: a curse aimed at a perk's PRIMARY type applies in full; one
 *   that only matches a secondary entry moves the perk's weight half as far
 *   from the neutral 1.0, so a +50% curse gives such a perk x1.25 and a -50%
 *   curse x0.75.
 * - Tarot Deck: a perk is dealt as its primary type's card with weight 1 and as
 *   each secondary type's card with this weight (see `pickPerkTarotType`).
 */
export const SECONDARY_TYPE_EFFECT = 0.5;

/**
 * 1 if the perk's primary type is one of `types`, SECONDARY_TYPE_EFFECT if only
 * a later entry is, otherwise 0. `types` is a category with its legacy aliases,
 * so a perk matching several of them still counts once, at its strongest.
 */
function perkTypeStrength(perk: Perk, types: readonly string[]): number {
  const own = getPerkTypes(perk);
  if (types.includes(own[0])) return 1;
  return own.some((t) => types.includes(t)) ? SECONDARY_TYPE_EFFECT : 0;
}

// Each curse category with the legacy spellings older cached data may carry.
const EXHAUSTION_TYPES = ['exhaustion'] as const;
const HEX_OR_BOON_TYPES = ['hex', 'boon'] as const;
const MEME_TYPES = ['entity', 'meme'] as const;
const GENERATOR_TYPES = ['generator', 'gen_slowdown'] as const;
const HEALING_TYPES = ['healing', 'altruism_healing'] as const;
const NEGATIVE_TYPES = ['sacrifice', 'handicap'] as const;
const AURA_TYPES = ['aura', 'aura_reading'] as const;
const CHASE_TYPES = ['chase'] as const;

function matchesAny(perk: Perk, types: readonly string[]): boolean {
  return perkTypeStrength(perk, types) > 0;
}

// ---------------------------------------------------------------------------
// Perk type predicates (used by Chaos Mutator weighting & filtering)
// ---------------------------------------------------------------------------

export function isExhaustionPerk(perk: Perk): boolean {
  return matchesAny(perk, EXHAUSTION_TYPES);
}

export function isHexPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'hex');
}

export function isBoonPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'boon');
}

export function isHexOrBoonPerk(perk: Perk): boolean {
  return matchesAny(perk, HEX_OR_BOON_TYPES);
}

export function isMemePerk(perk: Perk): boolean {
  return matchesAny(perk, MEME_TYPES);
}

export function isGenRegressionPerk(perk: Perk): boolean {
  return matchesAny(perk, GENERATOR_TYPES);
}

export function isHealingOrAltruismPerk(perk: Perk): boolean {
  return matchesAny(perk, HEALING_TYPES);
}

export function isNegativePerk(perk: Perk): boolean {
  return matchesAny(perk, NEGATIVE_TYPES);
}

export function isAuraPerk(perk: Perk): boolean {
  return matchesAny(perk, AURA_TYPES);
}

export function isChasePerk(perk: Perk): boolean {
  return matchesAny(perk, CHASE_TYPES);
}

export function isGeneratorPerk(perk: Perk): boolean {
  return isGenRegressionPerk(perk);
}

export function isHealingPerk(perk: Perk): boolean {
  return isHealingOrAltruismPerk(perk);
}

export function isStealthPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'stealth');
}

// ---------------------------------------------------------------------------
// Mutator helpers
// ---------------------------------------------------------------------------

export function isPerkBlockedByMutator(
  perk: Perk,
  mutator?: ChaosMutator | null
): boolean {
  if (!mutator) return false;
  if (mutator.id === 'no_exhaustion') return isExhaustionPerk(perk);
  if (mutator.id === 'no_slowdown') return isGeneratorPerk(perk);
  return false;
}

/**
 * Which perk types each curse reweights, and by how much for a perk whose
 * PRIMARY type matches. Decreased probability is x0.50, increased x1.50.
 */
const CURSE_WEIGHT_RULES: Readonly<Record<string, { types: readonly string[]; weight: number }>> = {
  // Curse of Blindness: aura perks drop chance reduced by 50%
  blindness: { types: AURA_TYPES, weight: 0.5 },
  // No Exhaustion: exhaustion perks drop chance reduced by 50%
  no_exhaustion: { types: EXHAUSTION_TYPES, weight: 0.5 },
  // No Gen Slowdown: generator perks drop chance reduced by 50%
  no_slowdown: { types: GENERATOR_TYPES, weight: 0.5 },
  // Curse of Solitude: healing perks drop chance reduced by 50%
  solo_queue: { types: HEALING_TYPES, weight: 0.5 },
  // Totem madness: hex and boon perks boosted by 50%
  hex_boon_only: { types: HEX_OR_BOON_TYPES, weight: 1.5 },
  hex_roulette: { types: HEX_OR_BOON_TYPES, weight: 1.5 },
  // Curse of the Clown: entity (chaotic wildcard) perks boosted by 50%
  meme_loadout: { types: MEME_TYPES, weight: 1.5 },
  // Pure Bloodlust: chase perks boosted by 50%
  chase_only: { types: CHASE_TYPES, weight: 1.5 },
  // Curse of Sacrifice / Entity: sacrifice perks boosted by 50%
  negative_only: { types: NEGATIVE_TYPES, weight: 1.5 },
};

/**
 * Probabilistic sampling weight for a perk given an active Chaos Mutator.
 * Default base weight is 1.0.
 * Decreased probability reduces weight by 50% (0.50).
 * Increased probability boosts weight by 50% (1.50).
 *
 * A perk can have several types. The full adjustment applies when the curse's
 * category is the perk's primary type; when it is only a later (secondary)
 * entry, the adjustment is scaled by SECONDARY_TYPE_EFFECT, i.e. x0.75 / x1.25.
 */
export function getPerkWeight(perk: Perk, mutator?: ChaosMutator | null): number {
  if (!mutator) return 1.0;

  // Own keys only: an id such as "toString" must read as "no rule", not as a
  // member inherited from Object.prototype.
  if (!Object.prototype.hasOwnProperty.call(CURSE_WEIGHT_RULES, mutator.id)) return 1.0;
  const rule = CURSE_WEIGHT_RULES[mutator.id];

  return 1.0 + (rule.weight - 1.0) * perkTypeStrength(perk, rule.types);
}

/**
 * Applies the active Chaos Mutator to a perk pool for fallback or exclusive filtering.
 */
export function filterPerksByMutator(
  perks: Perk[],
  mutator?: ChaosMutator | null
): Perk[] {
  if (!mutator) return perks;

  let included: Perk[];
  if (mutator.id === 'hex_boon_only' || mutator.id === 'hex_roulette') {
    included = perks.filter(isHexOrBoonPerk);
  } else if (mutator.id === 'meme_loadout') {
    included = perks.filter(isMemePerk);
  } else if (mutator.id === 'negative_only') {
    included = perks.filter(isNegativePerk);
  } else if (mutator.id === 'chase_only') {
    included = perks.filter(isChasePerk);
  } else if (mutator.id === 'no_exhaustion') {
    included = perks.filter((p) => !isExhaustionPerk(p));
  } else if (mutator.id === 'no_slowdown') {
    included = perks.filter((p) => !isGeneratorPerk(p));
  } else {
    included = perks;
  }

  return included.length > 0 ? included : perks;
}

/**
 * Eligibility is role + ownership only.
 */
export function computeEligiblePool(
  allPerks: Perk[],
  role: RoleCategory,
  isLoggedIn: boolean
): Perk[] {
  const rolePerks = allPerks.filter((p) => p.category === role);
  const eligible = isLoggedIn
    ? rolePerks.filter((p) => p.is_owned !== false)
    : rolePerks;

  return eligible.sort((a, b) => a.name.localeCompare(b.name));
}

export function computePlayablePool(
  eligiblePool: Perk[],
  noRepeatPerks: boolean,
  drawnPerkNames: string[]
): Perk[] {
  if (!noRepeatPerks) return eligiblePool;
  const drawnSet = new Set(drawnPerkNames);
  const remaining = eligiblePool.filter((p) => !drawnSet.has(p.name));
  return remaining.length > 0 ? remaining : eligiblePool;
}

/**
 * Picks `count` distinct perks from `pool` using weighted sampling without replacement.
 *
 * Every Chaos Mutator is a soft probability adjustment, never a hard filter:
 * every eligible perk stays a candidate, only the weighting changes via
 * `getPerkWeight`. Pre-filtering to only matching perks would turn an
 * advertised "X% reduced" chance into an accidental hard exclude.
 *
 * No-Repeat Mode is a deliberately hard rule enforced upstream by the caller
 * passing an already-narrowed pool (see `computePlayablePool`).
 */
export function pickRandomLoadout(
  pool: Perk[],
  mutator?: ChaosMutator | null,
  count: number = 4
): Perk[] {
  if (pool.length === 0) return [];

  const remaining = [...pool];
  const picked: Perk[] = [];
  const needed = Math.min(count, remaining.length);

  for (let step = 0; step < needed; step++) {
    const weights = remaining.map((p) => getPerkWeight(p, mutator));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight <= 0) {
      const idx = Math.floor(Math.random() * remaining.length);
      picked.push(remaining.splice(idx, 1)[0]);
      continue;
    }

    let r = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        selectedIdx = i;
        break;
      }
    }
    picked.push(remaining.splice(selectedIdx, 1)[0]);
  }

  return picked;
}

export function buildDrawnSlots(
  pickedPerks: Perk[],
  sortedPool: Perk[],
  perksPerPage: number = 15
): DrawnSlot[] {
  return pickedPerks.map((perk) => {
    const indexInSorted = sortedPool.findIndex((p) => p.name === perk.name);
    const safeIndex = Math.max(0, indexInSorted);
    const page = Math.floor(safeIndex / perksPerPage) + 1;
    const slot = (safeIndex % perksPerPage) + 1;
    return { page, slot, perk };
  });
}

// ---------------------------------------------------------------------------
// Tarot Deck archetype resolution — the first entry of perk_types
// ---------------------------------------------------------------------------

export type TarotType =
  | 'hex'
  | 'boon'
  | 'sacrifice'
  | 'exhaustion'
  | 'obsession'
  | 'aura'
  | 'generator'
  | 'healing'
  | 'chase'
  | 'stealth'
  | 'entity'
  | 'hooks';

const TAROT_TYPES: readonly string[] = [
  'hex', 'boon', 'sacrifice', 'exhaustion', 'obsession',
  'aura', 'generator', 'healing', 'chase', 'stealth', 'entity', 'hooks',
];

/** The perk's types that have a Tarot card, in order (unknown strings dropped). */
function getPerkTarotTypes(perk: Perk): TarotType[] {
  return getPerkTypes(perk).filter((t): t is TarotType => TAROT_TYPES.includes(t));
}

/**
 * Returns the perk's PRIMARY Tarot card archetype: the first entry of
 * `perk.perk_types`. Deterministic -- the card a perk is drawn as most often.
 * The backend seed is the single source of truth. Unknown/missing types fall
 * back to 'entity' (the wildcard).
 */
export function getPerkTarotType(perk: Perk): TarotType {
  return getPerkTarotTypes(perk)[0] ?? 'entity';
}

/**
 * Picks the Tarot card a drawn perk is dealt as. A card shows exactly one
 * type, so a perk with several is dealt as its primary type's card with weight
 * 1 and as each secondary type's card with weight SECONDARY_TYPE_EFFECT: a
 * two-type perk is dealt 2:1 (about 67% / 33%), a three-type perk 2:1:1
 * (50% / 25% / 25%). A perk with one type always gets that card.
 *
 * Call it once when the card is dealt, not while rendering, or the card would
 * change on every re-render. `random` is injectable for tests.
 */
export function pickPerkTarotType(perk: Perk, random: () => number = Math.random): TarotType {
  const types = getPerkTarotTypes(perk);
  if (types.length === 0) return 'entity';
  if (types.length === 1) return types[0];

  const weights = types.map((_, i) => (i === 0 ? 1 : SECONDARY_TYPE_EFFECT));
  let r = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r < 0) return types[i];
  }
  return types[0];
}
