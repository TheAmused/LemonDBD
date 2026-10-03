'use client';
// frontend/src/components/maps/MapsSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import type { Dictionary } from '@/locales/types';
import { useDictionary } from "@/context/DictionaryContext";

interface MapsSkeletonProps {
  className?: string;
  ariaLabel?: string;
  count?: number;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Tactical Maps Explorer (/maps).
 */
export const MapsPageSkeleton: React.FC<MapsSkeletonProps> = ({ className = '', ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.maps.initializingTacticalMap;

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`w-full min-h-[460px] select-none flex flex-col items-center justify-center p-6 ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.6}
        label={loadingLabel}
      />
    </div>
  );
};

export default MapsPageSkeleton;
