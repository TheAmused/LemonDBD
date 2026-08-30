import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { EXHAUSTION_PERK_NAMES, MEME_PERK_NAMES } from '@/constants/chaosMutators';

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

export function isPerkBlockedByMutator(
  perk: Perk,
  mutator?: ChaosMutator | null
): boolean {
  if (!mutator) return false;
  if (mutator.id === 'no_exhaustion') return isExhaustionPerk(perk);
  return false;
}

/**
 * Applies the active Chaos Mutator to a perk pool: first excludes any perk
 * explicitly blocked by the mutator (currently only `no_exhaustion`), then —
 * for inclusion-style mutators (`hex_boon_only`, `meme_loadout`) — narrows to
 * matching perks, falling back to the not-blocked list if that would empty
 * the pool. Shared by every draw mode so mutator behavior is identical
 * everywhere (previously only the Wheel applied hex_boon_only/meme_loadout).
 */
export function filterPerksByMutator(
  perks: Perk[],
  mutator?: ChaosMutator | null
): Perk[] {
  if (!mutator) return perks;

  const notBlocked = perks.filter((p) => !isPerkBlockedByMutator(p, mutator));

  let included: Perk[];
  if (mutator.id === 'hex_boon_only') {
    included = notBlocked.filter(isHexOrBoonPerk);
  } else if (mutator.id === 'meme_loadout') {
    included = notBlocked.filter(isMemePerk);
  } else {
    included = notBlocked;
  }

  return included.length > 0 ? included : notBlocked;
}

/**
 * Eligibility is role + ownership only — there is no separate manual
 * character-enable toggle. When logged in, only perks the user actually
 * owns are eligible; when not logged in, every perk for the role is shown.
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

export function pickRandomLoadout(
  pool: Perk[],
  mutator?: ChaosMutator | null,
  count: number = 4
): Perk[] {
  const candidates = [...filterPerksByMutator(pool, mutator)];
  const picked: Perk[] = [];
  const needed = Math.min(count, candidates.length);

  for (let i = 0; i < needed; i++) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    picked.push(candidates.splice(randomIndex, 1)[0]);
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
