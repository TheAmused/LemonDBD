'use client';
// frontend/src/components/maps/MapsSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface MapsSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
  count?: number;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Tactical Maps Explorer (/maps).
 */
export const MapsPageSkeleton: React.FC<MapsSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.maps?.initializingTacticalMap || dict?.app?.loading || 'Initializing tactical realm coordinates...';

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
        accent="cyan"
        needleSpeed={1.6}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default MapsPageSkeleton;
