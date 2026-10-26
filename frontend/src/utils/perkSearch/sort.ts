// frontend/src/utils/perkSearch/sort.ts
import type { Perk, SortField, SortOrder } from '@/types/perks';
import type { PerkSearchHit } from './match';

/** Best match first, then by name in the UI language. */
export function sortByRelevance<T extends Perk>(hits: readonly PerkSearchHit<T>[], locale: string): T[] {
  return [...hits]
    .sort((a, b) => a.rank - b.rank || a.perk.name.localeCompare(b.perk.name, locale))
    .map((hit) => hit.perk);
}

/** The Perks page orders: by displayed name, or by character with name as the tie-break. */
export function sortPerks<T extends Perk>(perks: readonly T[], field: SortField, order: SortOrder, locale: string): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, locale);
  const compare =
    field === 'character'
      ? (a: T, b: T) => (a.character || '').localeCompare(b.character || '', locale) || byName(a, b)
      : byName;
  const sorted = [...perks].sort(compare);
  return order === 'desc' ? sorted.reverse() : sorted;
}
