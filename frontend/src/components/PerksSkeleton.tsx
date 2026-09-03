'use client';
// frontend/src/components/PerksSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface PerksSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
  count?: number;
}

export const PerksGridSkeleton: React.FC<PerksSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.filters?.loadingPerks || dict?.app?.loading;

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
        accent="crimson"
        needleSpeed={1.2}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default PerksGridSkeleton;

