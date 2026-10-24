// frontend/src/utils/perkSearch/parse.ts
import { isPerkType, type PerkType } from '@/utils/perkTypes';
import { compactSearchText, foldSearchText, hasCjk } from './normalize';
import { TYPO_MIN_LENGTH, type PerkFacet, type PerkTypeVocabulary } from './vocabulary';

export interface ParsedPerkQuery {
  /** Every free-text word, folded (`type:`/`#` terms taken out). */
  words: string[];
  /** The words left once the ones naming a type or "general" are taken out. */
  restWords: string[];
  /** Types named implicitly. Each group is one word's meaning (any of its types); all groups must hold. */
  typeGroups: PerkType[][];
  /** "general" was named implicitly. */
  general: boolean;
  /** Types asked for with `type:healing` or `#healing`: strict filters. */
  explicitTypes: PerkType[];
  /** `type:general` / `#general`: a strict filter. */
  explicitGeneral: boolean;
}

export const EMPTY_QUERY: ParsedPerkQuery = {
  words: [],
  restWords: [],
  typeGroups: [],
  general: false,
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
 * Splits a search into free text and the perk types it names.
 *
 * "hex ruin" -> type hex + text "ruin"; "gen aura" -> types generator and aura;
 * "type:chase sprint" -> strict type chase + text "sprint"; "exaustion" ->
 * type exhaustion (one typo). Matching keeps every literal text match as well
 * (see searchPerks), so naming a type never hides a perk found by its name.
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

  const words = [...foldSearchText(freeText).split(' '), ...leftovers].filter(Boolean);
  const restWords: string[] = [];
  const groups = new Map<string, PerkType[]>();
  let general = false;
  const take = (facets: ReadonlySet<PerkFacet>) => {
    const types = [...facets].filter(isPerkType);
    if (facets.has('general')) general = true;
    if (types.length > 0) groups.set([...types].sort().join('|'), types);
  };

  let i = 0;
  while (i < words.length) {
    let matched = 0;
    for (let len = Math.min(vocab.maxWords, words.length - i); len >= 1 && !matched; len -= 1) {
      const facets = vocab.phrases.get(words.slice(i, i + len).join(' '));
      if (facets) {
        take(facets);
        matched = len;
      }
    }
    if (matched) {
      i += matched;
      continue;
    }
    const word = words[i];
    if (hasCjk(word)) {
      let rest = word;
      for (const [phrase, facets] of vocab.cjk) {
        if (!rest.includes(phrase)) continue;
        take(facets);
        rest = rest.split(phrase).join(' ');
      }
      restWords.push(...rest.split(' ').filter(Boolean));
    } else {
      const facets = lookupFacets(word, vocab);
      if (facets) take(facets);
      else restWords.push(word);
    }
    i += 1;
  }

  return {
    words,
    restWords: restWords.map(compactSearchText),
    typeGroups: [...groups.values()],
    general,
    explicitTypes: [...explicitTypes],
    explicitGeneral,
  };
}

/** Whether the search asks for anything at all. */
export function isEmptyQuery(query: ParsedPerkQuery): boolean {
  return query.words.length === 0 && query.explicitTypes.length === 0 && !query.explicitGeneral;
}
