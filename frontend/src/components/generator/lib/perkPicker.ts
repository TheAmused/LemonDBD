// frontend/src/components/generator/lib/perkPicker.ts
//
// perk.perk_type IS the Tarot archetype. One source of truth.
// No keyword scanning needed — the backend seed data classifies every perk
// into exactly one of: hex | boon | sacrifice | exhaustion | obsession |
// aura | generator | healing | chase | stealth | entity
//
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';

/**
 * All classification below reads directly from `perk.perk_type` (set by the
 * backend seed, now using Tarot archetype values). No description-keyword
 * matching, no hardcoded name lists -- the backend is the single source of
 * truth. A perk with no perk_type (stale cached data) is treated as 'entity'.
 */
function hasPerkType(perk: Perk, type: string): boolean {
  return (perk.perk_type || 'entity') === type;
}

// ---------------------------------------------------------------------------
// Perk type predicates (used by Chaos Mutator weighting & filtering)
// ---------------------------------------------------------------------------

export function isExhaustionPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'exhaustion');
}

export function isHexPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'hex');
}

export function isBoonPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'boon');
}

export function isHexOrBoonPerk(perk: Perk): boolean {
  return isHexPerk(perk) || isBoonPerk(perk);
}

export function isMemePerk(perk: Perk): boolean {
  // 'meme' bucket merged into 'entity' — kept for backward-compatibility with
  // any call site that hasn't been updated yet. Entity is the new wildcard.
  return hasPerkType(perk, 'entity');
}

export function isGenRegressionPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'generator');
}

export function isHealingOrAltruismPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'healing');
}

export function isNegativePerk(perk: Perk): boolean {
  return hasPerkType(perk, 'sacrifice');
}

export function isAuraPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'aura');
}

export function isChasePerk(perk: Perk): boolean {
  return hasPerkType(perk, 'chase');
}

export function isGeneratorPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'generator');
}

export function isHealingPerk(perk: Perk): boolean {
  return hasPerkType(perk, 'healing');
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
 * Probabilistic sampling weight for a perk given an active Chaos Mutator.
 * Default base weight is 1.0.
 * Decreased probability reduces weight by 50% (0.50).
 * Increased probability boosts weight by 50% (1.50).
 */
export function getPerkWeight(perk: Perk, mutator?: ChaosMutator | null): number {
  if (!mutator) return 1.0;

  switch (mutator.id) {
    case 'blindness':
      // Curse of Blindness: aura perks drop chance reduced by 50%
      if (isAuraPerk(perk)) return 0.50;
      return 1.0;

    case 'no_exhaustion':
      // No Exhaustion: exhaustion perks drop chance reduced by 50%
      if (isExhaustionPerk(perk)) return 0.50;
      return 1.0;

    case 'no_slowdown':
      // No Gen Slowdown: generator perks drop chance reduced by 50%
      if (isGeneratorPerk(perk)) return 0.50;
      return 1.0;

    case 'solo_queue':
      // Curse of Solitude: healing perks drop chance reduced by 50%
      if (isHealingPerk(perk)) return 0.50;
      return 1.0;

    case 'hex_boon_only':
    case 'hex_roulette':
      // Totem madness: hex and boon perks boosted by 50%
      if (isHexOrBoonPerk(perk)) return 1.50;
      return 1.0;

    case 'meme_loadout':
      // Curse of the Clown: entity (chaotic wildcard) perks boosted by 50%
      if (isMemePerk(perk)) return 1.50;
      return 1.0;

    case 'chase_only':
      // Pure Bloodlust: chase perks boosted by 50%
      if (isChasePerk(perk)) return 1.50;
      return 1.0;

    case 'negative_only':
      // Curse of Sacrifice / Entity: sacrifice perks boosted by 50%
      if (isNegativePerk(perk)) return 1.50;
      return 1.0;

    default:
      return 1.0;
  }
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
// Tarot Deck archetype resolution — now a trivial perk_type passthrough
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
  | 'entity';

/**
 * Returns the perk's Tarot card archetype.
 *
 * perk.perk_type IS the TarotType — no secondary classification needed.
 * The backend seed is the single source of truth. Unknown/missing types
 * fall back to 'entity' (the wildcard).
 */
export function getPerkTarotType(perk: Perk): TarotType {
  const VALID: readonly string[] = [
    'hex', 'boon', 'sacrifice', 'exhaustion', 'obsession',
    'aura', 'generator', 'healing', 'chase', 'stealth', 'entity',
  ];
  const t = perk.perk_type || 'entity';
  return (VALID.includes(t) ? t : 'entity') as TarotType;
}
