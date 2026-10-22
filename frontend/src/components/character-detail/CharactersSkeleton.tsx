'use client';
// frontend/src/components/character-detail/CharactersSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { useDictionary } from "@/context/DictionaryContext";

interface CharactersSkeletonProps {
  className?: string;
  ariaLabel?: string;
  count?: number;
  sublabel?: string;
}

/**
 * DBD Skill Check Framer Motion Loading Spinner for the Character Roster Grid (/characters).
 */
export const CharactersGridSkeleton: React.FC<CharactersSkeletonProps> = ({ className = '', ariaLabel, sublabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.characterDetail.loading;

  return (
    <output
      aria-label={loadingLabel}
      aria-busy="true"
      className={`flex min-h-115 w-full flex-1 flex-col items-center justify-center p-6 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.4}
        label={loadingLabel}
        sublabel={sublabel ?? 'Loading survivor & killer dossiers'}
      />
    </output>
  );
};

/**
 * DBD Skill Check Framer Motion Loading Spinner for Character Detail Page (/characters/[slug]).
 */
export const CharacterDetailSkeleton: React.FC<CharactersSkeletonProps> = ({ className = '', ariaLabel, sublabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.characterDetail.loading;

  return (
    <output
      aria-label={loadingLabel}
      aria-busy="true"
      className={`flex min-h-130 w-full flex-1 flex-col items-center justify-center p-8 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.3}
        label={loadingLabel}
        sublabel={sublabel ?? 'Loading unique perks, power stats, and bio'}
      />
    </output>
  );
};
