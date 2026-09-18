// frontend/src/components/generator/lib/perkPicker.ts
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { STEALTH_KEYWORDS, OBSESSION_KEYWORDS } from '@/constants/perkTraitKeywords';

/**
 * All of the curse-relevant perk classification below is keyed off the
 * backend-owned `perk.curse_category` field (set by DBD-knowledge-grounded
 * classification in `perks.json`, exposed via `Perk.to_dict()` /
 * `PerkResponse`), not hardcoded name lists or description-keyword
 * matching. A perk with no `curse_category` (e.g. stale cached data) is
 * treated as 'general' -- never as matching a specific curse category.
 */
function hasCurseCategory(perk: Perk, category: string): boolean {
  return (perk.curse_category || 'general') === category;
}

export function isExhaustionPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'exhaustion');
}

export function isHexPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'hex');
}

export function isBoonPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'boon');
}

export function isHexOrBoonPerk(perk: Perk): boolean {
  return isHexPerk(perk) || isBoonPerk(perk);
}

export function isMemePerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'meme');
}

export function isGenRegressionPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'gen_slowdown');
}

export function isHealingOrAltruismPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'altruism_healing');
}

export function isChasePerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'chase');
}

export function isAuraPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'aura_reading');
}

export function isNegativePerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'handicap');
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
 *
 * Every Chaos Mutator here is a soft probability adjustment, never a hard
 * filter: every eligible perk in `pool` stays a candidate, and only the
 * *weighting* changes via `getPerkWeight(perk, mutator)` (a reduced chance
 * for no_exhaustion/no_slowdown, a boosted chance for the theme curses).
 * Pre-filtering the pool down to only matching/non-matching perks would turn
 * an advertised "X% reduced" or "Nx boosted" CHANCE into an accidental hard
 * include/exclude that either always or never produces a given perk type --
 * that used to be a real bug here and must not come back.
 *
 * No-Repeat Mode is a DIFFERENT, deliberately hard rule: it is enforced
 * upstream, by the caller passing an already-narrowed `pool` (see
 * `computePlayablePool`) that has drawn perks removed entirely. "No-Repeat"
 * means no repeats, full stop -- unlike the mutators above, it is never
 * softened into a lower chance here.
 */
export function pickRandomLoadout(
  pool: Perk[],
  mutator?: ChaosMutator | null,
  count: number = 4
): Perk[] {
  if (pool.length === 0) return [];
  const candidates: Perk[] = pool;

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

function descriptionMatchesAny(perk: Perk, keywords: readonly string[]): boolean {
  const desc = (perk.description || '').toLowerCase();
  return keywords.some((keyword) => desc.includes(keyword.toLowerCase()));
}

export function isGeneratorPerk(perk: Perk): boolean {
  return hasCurseCategory(perk, 'gen_slowdown');
}

export function isHealingPerk(perk: Perk): boolean {
  return isHealingOrAltruismPerk(perk);
}

// Stealth and Obsession have no dedicated curse_category bucket (they cut
// across several categories), so the Tarot Deck's "type predicts the perk"
// taxonomy keeps its multilingual description-keyword matching for these two.
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
