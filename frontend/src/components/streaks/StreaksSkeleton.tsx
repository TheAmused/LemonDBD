'use client';
// frontend/src/components/streaks/StreaksSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface StreaksSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Streaks & Challenges Hub (/streaks).
 */
export const StreaksHubSkeleton: React.FC<StreaksSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.streaks?.loadingStreak || dict?.app?.loading || 'Loading trials and streak gauntlets...';

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
        accent="violet"
        needleSpeed={1.1}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Streak Board (/streaks/[role]/[streakId]).
 */
export const StreakBoardSkeleton: React.FC<StreaksSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.streaks?.loadingStreak || dict?.app?.loading || 'Calibrating streak board...';

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`w-full min-h-[500px] select-none flex flex-col items-center justify-center p-8 ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="violet"
        needleSpeed={1.1}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default StreaksHubSkeleton;
