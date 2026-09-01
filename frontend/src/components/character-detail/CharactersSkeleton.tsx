'use client';
// frontend/src/components/character-detail/CharactersSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface CharactersSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
  count?: number;
}

/**
 * DBD Skill Check Framer Motion Loading Spinner for the Character Roster Grid (/characters).
 */
export const CharactersGridSkeleton: React.FC<CharactersSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.characterDetail?.loading || dict?.app?.loading || 'Loading characters...';

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`flex min-h-[460px] w-full flex-1 flex-col items-center justify-center p-6 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="emerald"
        needleSpeed={1.4}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

/**
 * DBD Skill Check Framer Motion Loading Spinner for Character Detail Page (/characters/[slug]).
 */
export const CharacterDetailSkeleton: React.FC<CharactersSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.characterDetail?.loading || dict?.app?.loading || 'Loading character details...';

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`flex min-h-[520px] w-full flex-1 flex-col items-center justify-center p-8 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.3}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default CharactersGridSkeleton;
