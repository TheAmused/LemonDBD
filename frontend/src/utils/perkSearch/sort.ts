// frontend/src/utils/perkSearch/sort.ts
import type { Perk, SortOrder } from '@/types/perks';
import type { PerkSearchHit } from './match';

/** Best match first, then by name in the UI language. */
export function sortByRelevance<T extends Perk>(hits: readonly PerkSearchHit<T>[], locale: string): T[] {
  return [...hits]
    .sort((a, b) => a.rank - b.rank || a.perk.name.localeCompare(b.perk.name, locale))
    .map((hit) => hit.perk);
}

/** The Perks page order: by displayed name, A to Z or Z to A. */
export function sortPerks<T extends Perk>(perks: readonly T[], order: SortOrder, locale: string): T[] {
  const sorted = [...perks].sort((a, b) => a.name.localeCompare(b.name, locale));
  return order === 'desc' ? sorted.reverse() : sorted;
}
