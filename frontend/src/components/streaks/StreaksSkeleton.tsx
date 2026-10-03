'use client';
// frontend/src/components/streaks/StreaksSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import type { Dictionary } from '@/locales/types';
import { useDictionary } from "@/context/DictionaryContext";

interface StreaksSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Streaks & Challenges Hub (/streaks).
 */
export const StreaksHubSkeleton: React.FC<StreaksSkeletonProps> = ({ className = '', ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.streaks.loadingStreak;

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
        needleSpeed={1.1}
        label={loadingLabel}
      />
    </div>
  );
};

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Streak Board (/streaks/[role]/[streakId]).
 */
export const StreakBoardSkeleton: React.FC<StreaksSkeletonProps> = ({ className = '', ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.streaks.loadingStreak;

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
        accent="blood"
        needleSpeed={1.1}
        label={loadingLabel}
      />
    </div>
  );
};
