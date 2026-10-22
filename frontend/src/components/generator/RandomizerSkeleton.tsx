'use client';
// frontend/src/components/generator/RandomizerSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { useDictionary } from "@/context/DictionaryContext";

interface RandomizerSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Perk Randomizer (/randomizer).
 */
export const RandomizerPageSkeleton: React.FC<RandomizerSkeletonProps> = ({ className = '', ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.app.loading;

  return (
    <output
      aria-label={loadingLabel}
      aria-busy="true"
      className={`min-h-110 w-full max-w-6xl mx-auto flex flex-col items-center justify-center p-6 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={0.9}
        label={loadingLabel}
      />
    </output>
  );
};
