// frontend/src/utils/perkSearch/suggest.ts
import type { PerkType } from '@/utils/perkTypes';
import { PERK_TYPES } from '@/utils/perkTypes';
import { foldSearchText, hasCjk } from './normalize';
import type { PerkTypeVocabulary } from './vocabulary';

export interface PerkTypeSuggestion {
  type: PerkType;
  /** The search text once the words that led to this suggestion are taken out. */
  remainingSearch: string;
}

const MAX_TYPE_SUGGESTIONS = 4;

const startsLike = (term: string, fragment: string) =>
  hasCjk(fragment) ? term.includes(fragment) : term.startsWith(fragment);

/**
 * The perk types the search is (probably) starting to name: "hea" -> Healing,
 * "scourge h" -> Scourge Hook. Matches the whole search first, then its last
 * word. `available` limits the answer (the role's types minus active chips).
 */
export function suggestPerkTypes(
  raw: string,
  vocab: PerkTypeVocabulary,
  available: readonly PerkType[]
): PerkTypeSuggestion[] {
  const trimmed = raw.trim();
  const whole = foldSearchText(trimmed);
  if (!whole) return [];
  const lastSpace = trimmed.search(/\s\S*$/);
  const head = lastSpace >= 0 ? trimmed.slice(0, lastSpace).trim() : '';
  const last = foldSearchText(lastSpace >= 0 ? trimmed.slice(lastSpace) : trimmed);
  const longEnough = (fragment: string) => fragment.length >= 2 || hasCjk(fragment);

  const found: (PerkTypeSuggestion & { labelHit: boolean })[] = [];
  for (const type of PERK_TYPES) {
    if (!available.includes(type)) continue;
    const terms = vocab.byType[type];
    let remainingSearch: string | null = null;
    if (longEnough(whole) && terms.some((term) => startsLike(term, whole))) remainingSearch = '';
    else if (head && longEnough(last) && terms.some((term) => startsLike(term, last))) remainingSearch = head;
    if (remainingSearch === null) continue;
    const fragment = remainingSearch === '' ? whole : last;
    found.push({ type, remainingSearch, labelHit: startsLike(terms[0], fragment) });
  }
  return found
    .sort((a, b) => Number(b.labelHit) - Number(a.labelHit))
    .slice(0, MAX_TYPE_SUGGESTIONS)
    .map(({ type, remainingSearch }) => ({ type, remainingSearch }));
}
