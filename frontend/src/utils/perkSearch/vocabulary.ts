// frontend/src/utils/perkSearch/vocabulary.ts
//
// The words that name a perk type in a search. Three sources, merged:
// - the type keys and the English community terms below, active in every
//   language (players say "gens" and "loop" whatever the UI language is);
// - the active locale's type labels;
// - the active locale's extra keywords (`dict.perkTypes.keywords`).
// The "general" words (`generalKeywords`) work the same way and select the
// perks no character owns.
import { PERK_TYPES, type PerkType } from '@/utils/perkTypes';
import { compactSearchText, foldSearchText, hasCjk } from './normalize';

/** A type, or the general-perk scope, that a search word can stand for. */
export type PerkFacet = PerkType | 'general';

/** Search vocabulary, not UI text: these terms are matched, never displayed. */
const COMMUNITY_KEYWORDS: Readonly<Record<PerkType, readonly string[]>> = {
  generator: ['gen', 'gens', 'regress', 'regression', 'kick', 'kicks'],
  healing: ['medkit', 'med'],
  chase: ['loop', 'loops', 'looping'],
  stealth: ['sneak', 'sneaky'],
  tracking: ['wallhack', 'wallhacks', 'reveal', 'reveals'],
  exhaustion: ['exh', 'exhaust'],
  sacrifice: [],
  obsession: ['obsess'],
  totem: ['totems'],
  hooks: ['scourge', 'scourge hook'],
  downed: ['down', 'carry', 'carried', 'crawl', 'crawling'],
  items: ['item', 'toolbox', 'toolboxes'],
  endgame: ['egc', 'end game', 'exit gates'],
  entity: ['block', 'blocks', 'blocked', 'blocking'],
};
const COMMUNITY_GENERAL = ['general'];

/** Typo tolerance only applies to Latin words this long (shorter ones collide too easily). */
export const TYPO_MIN_LENGTH = 5;

export interface PerkTypeWords {
  labels: Readonly<Record<PerkType, string>>;
  keywords: Readonly<Record<PerkType, string>>;
  generalKeywords: string;
}

type FacetEntry = readonly [phrase: string, facets: ReadonlySet<PerkFacet>];

export interface PerkTypeVocabulary {
  /** Folded phrase ("scourge hook") -> what it stands for. */
  readonly phrases: ReadonlyMap<string, ReadonlySet<PerkFacet>>;
  /** Most words in one phrase, for longest-match-first scanning. */
  readonly maxWords: number;
  /** Japanese/Chinese phrases, longest first, matched inside a word. */
  readonly cjk: readonly FacetEntry[];
  /** Single Latin words long enough for typo matching. */
  readonly typoTargets: readonly FacetEntry[];
  /** Every folded word that names each type (label first), for suggestions. */
  readonly byType: Readonly<Record<PerkType, readonly string[]>>;
  readonly labels: Readonly<Record<PerkType, string>>;
}

const splitList = (list: string): string[] =>
  list.split(',').map(foldSearchText).filter(Boolean);

export function buildPerkTypeVocabulary(words: PerkTypeWords): PerkTypeVocabulary {
  const phrases = new Map<string, Set<PerkFacet>>();
  const add = (phrase: string, facet: PerkFacet) => {
    if (!phrase) return;
    const set = phrases.get(phrase) ?? new Set<PerkFacet>();
    set.add(facet);
    phrases.set(phrase, set);
  };

  const byType = {} as Record<PerkType, string[]>;
  for (const type of PERK_TYPES) {
    const terms = [
      foldSearchText(words.labels[type]),
      type,
      ...COMMUNITY_KEYWORDS[type].map(foldSearchText),
      ...splitList(words.keywords[type]),
    ].filter(Boolean);
    byType[type] = [...new Set(terms)];
    for (const term of byType[type]) add(term, type);
  }
  for (const term of [...COMMUNITY_GENERAL, ...splitList(words.generalKeywords)]) add(term, 'general');

  const entries: FacetEntry[] = [...phrases.entries()];
  return {
    phrases,
    maxWords: Math.max(1, ...entries.map(([phrase]) => phrase.split(' ').length)),
    cjk: entries
      .filter(([phrase]) => hasCjk(phrase))
      .map(([phrase, facets]): FacetEntry => [compactSearchText(phrase), facets])
      .sort((a, b) => b[0].length - a[0].length),
    typoTargets: entries.filter(([phrase]) => !phrase.includes(' ') && !hasCjk(phrase) && phrase.length >= TYPO_MIN_LENGTH),
    byType,
    labels: words.labels,
  };
}
