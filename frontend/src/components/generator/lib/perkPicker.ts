// frontend/src/components/generator/lib/perkPicker.ts
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import {
  EXHAUSTION_PERK_NAMES,
  GEN_REGRESSION_PERK_NAMES,
  AURA_PERK_NAMES,
  HEALING_ALTRUISM_PERK_NAMES,
  CHASE_PERK_NAMES,
  MEME_PERK_NAMES,
  NEGATIVE_PERK_NAMES,
} from '@/constants/chaosMutators';
import {
  AURA_KEYWORDS,
  GENERATOR_KEYWORDS,
  HEALING_KEYWORDS,
  CHASE_KEYWORDS,
  STEALTH_KEYWORDS,
  OBSESSION_KEYWORDS,
} from '@/constants/perkTraitKeywords';

export function isExhaustionPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase().trim();
  const descLower = (perk.description || '').toLowerCase();
  return (
    EXHAUSTION_PERK_NAMES.has(nameLower) ||
    descLower.includes('exhausted') ||
    descLower.includes('exhaustion')
  );
}

export function isHexOrBoonPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  const descLower = (perk.description || '').toLowerCase();
  return (
    nameLower.includes('hex:') ||
    nameLower.includes('boon:') ||
    descLower.includes('hex:') ||
    descLower.includes('boon:')
  );
}

export function isMemePerk(perk: Perk): boolean {
  return MEME_PERK_NAMES.has(perk.name.toLowerCase().trim());
}

const GEN_REGRESSION_KEYWORDS: readonly string[] = [
  'regression',
  'regress',
  'regressing',
  'damage generator',
  'damage a generator',
  'generator loses',
  'generator explodes',
  'blocked by the entity',
  'regresja',
  'regresji',
  'kopnięcie generatora',
  'zablokowany przez byt',
];

export function isGenRegressionPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase().trim();
  if (GEN_REGRESSION_PERK_NAMES.has(nameLower)) return true;
  return descriptionMatchesAny(perk, GEN_REGRESSION_KEYWORDS);
}

export function isHealingOrAltruismPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase().trim();
  if (HEALING_ALTRUISM_PERK_NAMES.has(nameLower)) return true;
  return descriptionMatchesAny(perk, HEALING_KEYWORDS);
}

export function isChasePerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase().trim();
  if (CHASE_PERK_NAMES.has(nameLower)) return true;
  return descriptionMatchesAny(perk, CHASE_KEYWORDS);
}

export function isPerkBlockedByMutator(
  perk: Perk,
  mutator?: ChaosMutator | null
): boolean {
  if (!mutator) return false;
  if (mutator.id === 'no_exhaustion') return isExhaustionPerk(perk);
  if (mutator.id === 'no_slowdown') return isGenRegressionPerk(perk);
  return false;
}

/**
 * Calculates the dynamic probabilistic sampling weight for a perk given an active Chaos Mutator.
 * Default base weight is 1.0.
 * Negative curses reduce perk weight (e.g. 0.1 for 90% drop rate reduction).
 * Buffs / theme curses increase perk weight (e.g. 4.0 - 5.0 for 4x - 5x boosted drop rate).
 */
export function getPerkWeight(perk: Perk, mutator?: ChaosMutator | null): number {
  if (!mutator) return 1.0;

  switch (mutator.id) {
    case 'blindness':
      // Curse of Blindness: Aura reading perks drop chance reduced by 85%
      if (isAuraPerk(perk)) return 0.15;
      return 1.0;

    case 'no_exhaustion':
      // No Exhaustion: Exhaustion perks drop chance reduced by 90%
      if (isExhaustionPerk(perk)) return 0.10;
      return 1.0;

    case 'no_slowdown':
      // No Gen Slowdown (Killer): Regression / slowdown perks drop chance reduced by 90%
      if (isGenRegressionPerk(perk)) return 0.10;
      return 1.0;

    case 'solo_queue':
      // Curse of Solitude: Altruism and healing perks reduced by 80%
      if (isHealingOrAltruismPerk(perk)) return 0.20;
      return 1.0;

    case 'hex_boon_only':
    case 'hex_roulette':
      // Totem madness: Hex and Boon perks boosted 5x
      if (isHexOrBoonPerk(perk)) return 5.0;
      return 1.0;

    case 'meme_loadout':
      // Meme / Off-Meta: Gimmick and meme perks boosted 4x
      if (isMemePerk(perk)) return 4.0;
      return 1.0;

    case 'chase_only':
      // Pure Bloodlust (Killer): Chase and pallet aggression perks boosted 4x
      if (isChasePerk(perk)) return 4.0;
      return 1.0;

    case 'negative_only':
      // Curse of Sacrifice / Entity: Drawback / handicap perks boosted 4x
      if (isNegativePerk(perk)) return 4.0;
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
    included = perks.filter((p) => !isGenRegressionPerk(p));
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
 * For theme/buff mutators, narrows to eligible candidates.
 * For curse mutators (blindness, no_exhaustion, no_slowdown, solo_queue), probabilistically
 * reduces drop chances (e.g. -85% / -90%) via `getPerkWeight(perk, mutator)`.
 */
export function pickRandomLoadout(
  pool: Perk[],
  mutator?: ChaosMutator | null,
  count: number = 4
): Perk[] {
  if (pool.length === 0) return [];
  let candidates: Perk[];
  if (
    mutator?.id === 'hex_boon_only' ||
    mutator?.id === 'hex_roulette' ||
    mutator?.id === 'meme_loadout' ||
    mutator?.id === 'negative_only' ||
    mutator?.id === 'chase_only'
  ) {
    candidates = filterPerksByMutator(pool, mutator);
  } else {
    candidates = pool;
  }

  const remaining = [...candidates];
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

export function isHexPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  const descLower = (perk.description || '').toLowerCase();
  return nameLower.includes('hex:') || descLower.includes('hex:');
}

export function isBoonPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  const descLower = (perk.description || '').toLowerCase();
  return nameLower.includes('boon:') || descLower.includes('boon:');
}

export function isNegativePerk(perk: Perk): boolean {
  return NEGATIVE_PERK_NAMES.has(perk.name.toLowerCase().trim());
}

function descriptionMatchesAny(perk: Perk, keywords: readonly string[]): boolean {
  const desc = (perk.description || '').toLowerCase();
  return keywords.some((keyword) => desc.includes(keyword.toLowerCase()));
}

export function isAuraPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase().trim();
  if (AURA_PERK_NAMES.has(nameLower)) return true;
  return descriptionMatchesAny(perk, AURA_KEYWORDS) || nameLower.includes('aura');
}

export function isGeneratorPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, GENERATOR_KEYWORDS);
}

export function isHealingPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, HEALING_KEYWORDS);
}

export function isStealthPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, STEALTH_KEYWORDS);
}

function isObsessionPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  return (
    nameLower.includes('obsession') ||
    descriptionMatchesAny(perk, OBSESSION_KEYWORDS)
  );
}

export function getPerkTarotType(perk: Perk): TarotType {
  if (isHexPerk(perk)) return 'hex';
  if (isBoonPerk(perk)) return 'boon';
  if (isNegativePerk(perk)) return 'sacrifice';
  if (isExhaustionPerk(perk)) return 'exhaustion';
  if (isObsessionPerk(perk)) return 'obsession';
  if (isAuraPerk(perk)) return 'aura';
  if (isGeneratorPerk(perk)) return 'generator';
  if (isHealingPerk(perk)) return 'healing';
  if (isChasePerk(perk)) return 'chase';
  if (isStealthPerk(perk)) return 'stealth';
  return 'entity';
}
