// frontend/src/utils/perkSearch/parse.ts
import type { PerkType } from '@/utils/perkTypes';
import { foldSearchText, hasCjk } from './normalize';
import { TYPO_MIN_LENGTH, type PerkFacet, type PerkTypeVocabulary } from './vocabulary';

export interface ParsedPerkQuery {
  /** Every free-text word, folded (`type:`/`#` terms taken out). Matched against names, aliases and characters only. */
  words: string[];
  /** Types asked for with `type:healing` or `#healing`: strict filters. */
  explicitTypes: PerkType[];
  /** `type:general` / `#general`: a strict filter. */
  explicitGeneral: boolean;
}

export const EMPTY_QUERY: ParsedPerkQuery = {
  words: [],
  explicitTypes: [],
  explicitGeneral: false,
};

const EXPLICIT_TERM = /(?:^|\s)(?:type:|#)\s*([^\s#]+)/giu;

/** Optimal string alignment distance, capped: true when `a` and `b` are at most one edit apart. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  const restA = a.slice(i);
  const restB = b.slice(i);
  if (restA.slice(1) === restB.slice(1)) return true; // substitution
  if (restA.slice(1) === restB || restA === restB.slice(1)) return true; // deletion / insertion
  return restA.length > 1 && restA[0] === restB[1] && restA[1] === restB[0] && restA.slice(2) === restB.slice(2); // swap
}

/** What a single folded word or phrase stands for, typos included. */
export function lookupFacets(term: string, vocab: PerkTypeVocabulary): ReadonlySet<PerkFacet> | undefined {
  const exact = vocab.phrases.get(term);
  if (exact) return exact;
  if (term.length < TYPO_MIN_LENGTH || hasCjk(term)) return undefined;
  return vocab.typoTargets.find(([target]) => withinOneEdit(term, target))?.[1];
}

/**
 * Splits a search into free text and the `type:`/`#` terms.
 *
 * "type:chase sprint" -> strict type chase + text "sprint"; "#exaustion" ->
 * type exhaustion (one typo). Plain words never stand for a type: "alert" finds
 * the perk Alert, not every Tracking perk. A type is picked on purpose, from
 * the suggestions under the field or as a chip (see suggestPerkTypes).
 */
export function parsePerkQuery(raw: string, vocab: PerkTypeVocabulary): ParsedPerkQuery {
  const explicitTypes = new Set<PerkType>();
  let explicitGeneral = false;
  const leftovers: string[] = [];
  const freeText = raw.replace(EXPLICIT_TERM, (_match, term: string) => {
    const folded = foldSearchText(term);
    const facets = folded ? lookupFacets(folded, vocab) : undefined;
    if (!facets) {
      leftovers.push(folded);
    } else {
      for (const facet of facets) {
        if (facet === 'general') explicitGeneral = true;
        else explicitTypes.add(facet);
      }
    }
    return ' ';
  });

  return {
    words: [...foldSearchText(freeText).split(' '), ...leftovers].filter(Boolean),
    explicitTypes: [...explicitTypes],
    explicitGeneral,
  };
}

/** Whether the search asks for anything at all. */
export function isEmptyQuery(query: ParsedPerkQuery): boolean {
  return query.words.length === 0 && query.explicitTypes.length === 0 && !query.explicitGeneral;
}
