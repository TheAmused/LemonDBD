'use client';
// frontend/src/components/PerksSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import type { Dictionary } from '@/locales/types';
import { useDictionary } from "@/context/DictionaryContext";

interface PerksSkeletonProps {
  className?: string;
  ariaLabel?: string;
  count?: number;
}

export const PerksGridSkeleton: React.FC<PerksSkeletonProps> = ({ className = '', ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.app.loadingPerks;

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`flex h-full min-h-[420px] w-full flex-1 flex-col items-center justify-center overflow-hidden select-none p-6 ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.2}
        label={loadingLabel}
      />
    </div>
  );
};

export default PerksGridSkeleton;

