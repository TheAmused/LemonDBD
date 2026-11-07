// frontend/src/utils/perkTypes.ts
//
// The perk-type vocabulary, mirrored from backend/app/models/perk_types.py
// (a unit test fails if the two lists drift). `perk.perk_types` is an ordered
// list of 1-3 of these; the first entry is the primary type. Each type names a
// moment of use, and `entity` marks perks that block things. Which types a role
// offers is read from the catalog itself (perkTypesByRole), so a type with no
// perks on a side -- Items for Killers today -- is never offered there.
import type { Perk, RoleCategory } from '@/types/perks';

export const PERK_TYPES = [
  'generator', 'healing', 'chase', 'stealth', 'tracking', 'exhaustion',
  'sacrifice', 'obsession', 'totem', 'hooks', 'downed', 'items', 'endgame',
  'entity',
] as const;

export type PerkType = (typeof PERK_TYPES)[number];

const KNOWN = new Set<string>(PERK_TYPES);

/** Types the category redesign renamed. Cached data and old API responses can still carry them. */
const LEGACY_RENAMES: Readonly<Record<string, PerkType>> = { aura: 'tracking', hex: 'totem', boon: 'totem' };

/** The list with renamed types under their current names; the same list when none is renamed. */
export function upgradeLegacyPerkTypes(types: readonly string[]): readonly string[] {
  const renamed = (t: string) => Object.prototype.hasOwnProperty.call(LEGACY_RENAMES, t);
  if (!types.some(renamed)) return types;
  const upgraded = types.map((t) => (renamed(t) ? LEGACY_RENAMES[t] : t));
  return upgraded.filter((t, i) => upgraded.indexOf(t) === i);
}

export function isPerkType(value: string): value is PerkType {
  return KNOWN.has(value);
}

/** The types the perk's list carries that this app knows, primary first. Empty when there is no list or none is known. */
export function readKnownPerkTypes(perk: Pick<Perk, 'perk_types'>): readonly PerkType[] {
  return upgradeLegacyPerkTypes(perk.perk_types ?? []).filter(isPerkType);
}

/** The perk's known types, primary first. A missing or empty list reads as ['entity']. */
export function getKnownPerkTypes(perk: Pick<Perk, 'perk_types'>): readonly PerkType[] {
  const known = readKnownPerkTypes(perk);
  return known.length > 0 ? known : ['entity'];
}

export type PerkTypeCounts = Partial<Record<PerkType, number>>;

/** How many of the perks have each type (a type none has is absent). */
export function countPerkTypes(perks: readonly Perk[]): PerkTypeCounts {
  const counts: PerkTypeCounts = {};
  for (const perk of perks) for (const type of getKnownPerkTypes(perk)) counts[type] = (counts[type] ?? 0) + 1;
  return counts;
}

/** The types that have at least one perk, in display order: no "Hex 0" on a side without hexes. */
export function typesWithPerks(counts: PerkTypeCounts): PerkType[] {
  return PERK_TYPES.filter((type) => (counts[type] ?? 0) > 0);
}

/** The types the given perks of each role actually have. */
export function perkTypesByRole(perks: readonly Perk[]): Record<RoleCategory, ReadonlySet<PerkType>> {
  const byRole: Record<RoleCategory, Set<PerkType>> = { Survivor: new Set(), Killer: new Set() };
  for (const perk of perks) {
    const set = perk.category === 'Killer' ? byRole.Killer : perk.category === 'Survivor' ? byRole.Survivor : null;
    if (set) for (const type of getKnownPerkTypes(perk)) set.add(type);
  }
  return byRole;
}
