// frontend/src/utils/perkTypes.ts
//
// The perk-type vocabulary, mirrored from backend/app/models/perk_types.py
// (a unit test fails if the two lists drift). `perk.perk_types` is an ordered
// list of 1-3 of these; the first entry is the primary type and `entity` is the
// catch-all that only ever appears alone. Which types a role offers is read from
// the catalog itself (perkTypesByRole), so a type with no perks on a side --
// Hex for Survivors today -- is never offered there.
import type { Perk, RoleCategory } from '@/types/perks';

export const PERK_TYPES = [
  'hex', 'boon', 'sacrifice', 'exhaustion', 'obsession',
  'aura', 'generator', 'healing', 'chase', 'stealth', 'entity', 'hooks',
] as const;

export type PerkType = (typeof PERK_TYPES)[number];

const KNOWN = new Set<string>(PERK_TYPES);

export function isPerkType(value: string): value is PerkType {
  return KNOWN.has(value);
}

/** The perk's known types, primary first. A missing or empty list reads as ['entity']. */
export function getKnownPerkTypes(perk: Pick<Perk, 'perk_types'>): readonly PerkType[] {
  const known = (perk.perk_types ?? []).filter(isPerkType);
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
