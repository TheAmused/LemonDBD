// frontend/src/utils/perkSearch/match.ts
import type { Perk, RoleCategory } from '@/types/perks';
import { getKnownPerkTypes, type PerkType } from '@/utils/perkTypes';
import { compactSearchText, foldSearchText } from './normalize';
import { isEmptyQuery, type ParsedPerkQuery } from './parse';

/** Lower ranks sort first. */
export const RANK = {
  exactName: 0,
  namePrefix: 1,
  nameContains: 2,
  otherText: 3,
  primaryType: 4,
  secondaryType: 5,
} as const;

export interface PerkSearchHit<T extends Perk> {
  perk: T;
  rank: number;
}

interface IndexedPerk {
  name: string;
  /** Compact folded name, alias, character and real name. */
  fields: string[];
  types: readonly PerkType[];
  general: boolean;
}

/** A general perk belongs to no character (or is a character perk's generic copy). */
export function isGeneralPerk(perk: Perk): boolean {
  return !perk.character || perk.character === 'General' || Boolean(perk.is_generic_counterpart);
}

// Catalog perks are stable objects from the shared cache, so each is folded once.
const indexCache = new WeakMap<Perk, IndexedPerk>();

function indexOf(perk: Perk): IndexedPerk {
  let entry = indexCache.get(perk);
  if (!entry) {
    const fold = (text?: string) => compactSearchText(foldSearchText(text ?? ''));
    const name = fold(perk.name);
    entry = {
      name,
      fields: [name, fold(perk.alternate_name), fold(perk.character), fold(perk.character_real_name)].filter(Boolean),
      types: getKnownPerkTypes(perk),
      general: isGeneralPerk(perk),
    };
    indexCache.set(perk, entry);
  }
  return entry;
}

const matchesWords = (entry: IndexedPerk, words: readonly string[]) =>
  words.every((word) => entry.fields.some((field) => field.includes(word)));

const typeRank = (entry: IndexedPerk, types: readonly PerkType[]) =>
  types.includes(entry.types[0]) ? RANK.primaryType : RANK.secondaryType;

/**
 * The rank of `perk` for `query` plus the strict `types` filter (type chips),
 * or null when it does not match.
 *
 * A perk matches when it has every strict type and then either
 * - every search word is found in its name, alias, character or real name, or
 * - it has one type of every type group the search named (and is general, if
 *   "general" was named) and the remaining words are found as above.
 * The first branch means naming a type never hides a perk found by its name.
 */
export function rankPerk(perk: Perk, query: ParsedPerkQuery, types: readonly PerkType[] = []): number | null {
  const entry = indexOf(perk);
  const strict = [...types, ...query.explicitTypes];
  if (!strict.every((type) => entry.types.includes(type))) return null;
  if (query.explicitGeneral && !entry.general) return null;

  const words = query.words.map(compactSearchText);
  if (words.length === 0) return strict.length > 0 ? typeRank(entry, strict) : RANK.otherText;

  if (matchesWords(entry, words)) {
    const whole = words.join('');
    if (entry.name === whole) return RANK.exactName;
    if (entry.name.startsWith(whole)) return RANK.namePrefix;
    if (entry.name.includes(whole)) return RANK.nameContains;
    return RANK.otherText;
  }

  const namesFacet = query.typeGroups.length > 0 || query.general;
  if (!namesFacet) return null;
  if (query.general && !entry.general) return null;
  if (!query.typeGroups.every((group) => group.some((type) => entry.types.includes(type)))) return null;
  if (!matchesWords(entry, query.restWords)) return null;
  const named = query.typeGroups.flat();
  return named.length > 0 ? typeRank(entry, named) : RANK.otherText;
}

/** The perks that match, in their original order, each with its rank. */
export function searchPerks<T extends Perk>(
  perks: readonly T[],
  query: ParsedPerkQuery,
  types: readonly PerkType[] = []
): PerkSearchHit<T>[] {
  if (isEmptyQuery(query) && types.length === 0) return perks.map((perk) => ({ perk, rank: RANK.otherText }));
  const hits: PerkSearchHit<T>[] = [];
  for (const perk of perks) {
    const rank = rankPerk(perk, query, types);
    if (rank !== null) hits.push({ perk, rank });
  }
  return hits;
}

/**
 * A type the search asks for that no perk of `role` has but the other role's
 * perks do, e.g. "exhaustion" on the Killer tab. `typesByRole` comes from the
 * catalog (perkTypesByRole). Null when there is no such conflict.
 */
export function roleOnlyConflict(
  query: ParsedPerkQuery,
  types: readonly PerkType[],
  role: RoleCategory,
  typesByRole: Readonly<Record<RoleCategory, ReadonlySet<PerkType>>>
): { type: PerkType; role: RoleCategory } | null {
  const other: RoleCategory = role === 'Killer' ? 'Survivor' : 'Killer';
  const groups = [...types.map((type) => [type]), ...query.explicitTypes.map((type) => [type]), ...query.typeGroups];
  for (const group of groups) {
    if (group.some((type) => typesByRole[role].has(type))) continue;
    const elsewhere = group.find((type) => typesByRole[other].has(type));
    if (elsewhere) return { type: elsewhere, role: other };
  }
  return null;
}

/** The active types the given role has perks of: what stays on when the role is switched by hand. */
export function typesForRole(
  types: readonly PerkType[],
  role: RoleCategory,
  typesByRole: Readonly<Record<RoleCategory, ReadonlySet<PerkType>>>
): PerkType[] {
  return types.filter((type) => typesByRole[role].has(type));
}
