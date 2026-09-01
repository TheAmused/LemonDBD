'use client';
// frontend/src/components/generator/RandomizerSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface RandomizerSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Perk Randomizer (/randomizer).
 */
export const RandomizerPageSkeleton: React.FC<RandomizerSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.generator?.loading || dict?.app?.loading || 'Initializing trial generator...';

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`min-h-[440px] w-full max-w-6xl mx-auto flex flex-col items-center justify-center p-6 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="amber"
        needleSpeed={0.9}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default RandomizerPageSkeleton;
