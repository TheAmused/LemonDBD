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

/** The perk's known types, primary first. A missing or empty list reads as ['entity']. */
export function getKnownPerkTypes(perk: Pick<Perk, 'perk_types'>): readonly PerkType[] {
  const known = upgradeLegacyPerkTypes(perk.perk_types ?? []).filter(isPerkType);
  return known.length > 0 ? known : ['entity'];
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
