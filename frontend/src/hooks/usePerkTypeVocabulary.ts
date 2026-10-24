'use client';
// frontend/src/hooks/usePerkTypeVocabulary.ts

import { useMemo } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { buildPerkTypeVocabulary, type PerkTypeVocabulary } from '@/utils/perkSearch/vocabulary';

/** The perk-type search vocabulary for the active language, built once per dictionary. */
export function usePerkTypeVocabulary(): PerkTypeVocabulary {
  const dict = useDictionary();
  return useMemo(() => buildPerkTypeVocabulary(dict.perkTypes), [dict]);
}
