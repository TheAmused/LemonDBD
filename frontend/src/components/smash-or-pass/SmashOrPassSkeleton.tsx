'use client';
// frontend/src/components/smash-or-pass/SmashOrPassSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import type { Dictionary } from '@/locales/types';
import { useDictionary } from "@/context/DictionaryContext";

interface SmashOrPassSkeletonProps {
  className?: string;
  mode?: 'full' | 'arena' | 'dock' | 'leaderboard';
  ariaLabel?: string;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Smash or Pass Arena.
 */
export const SmashHubSkeleton: React.FC<SmashOrPassSkeletonProps> = ({ className = '', ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.smashOrPass.loadingArena;

  return (
    <div
      role="status"
      aria-label={loadingLabel}
      aria-busy="true"
      className={`relative min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6 select-none ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.0}
        label={loadingLabel}
      />
    </div>
  );
};

/**
 * DBD Skill Check Framer Motion Loading Spinner for Leaderboard Modal.
 */
export const SmashLeaderboardSkeleton: React.FC<{ count?: number;
 ariaLabel?: string }> = ({ ariaLabel }) => {
  const dict = useDictionary();
  const loadingLabel = ariaLabel || dict.smashOrPass.loadingRankings;

  return (
    <div
      className="py-8 flex flex-col items-center justify-center select-none"
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
    >
      <DbdSpinner
        size="md"
        layout="inline"
        accent="blood"
        needleSpeed={1.0}
        label={loadingLabel}
      />
    </div>
  );
};

export default SmashHubSkeleton;
