'use client';
// frontend/src/components/smash-or-pass/SmashOrPassSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface SmashOrPassSkeletonProps {
  className?: string;
  mode?: 'full' | 'arena' | 'dock' | 'leaderboard';
  dict?: Dictionary | any;
  ariaLabel?: string;
}

/**
 * Universal DBD Skill Check Framer Motion Loading Spinner for Smash or Pass Arena.
 */
export const SmashHubSkeleton: React.FC<SmashOrPassSkeletonProps> = ({ className = '', dict, ariaLabel }) => {
  const loadingLabel = ariaLabel || dict?.smashOrPass?.loadingArena || dict?.app?.loading || 'Summoning trial candidates...';

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
        dict={dict}
      />
    </div>
  );
};

/**
 * DBD Skill Check Framer Motion Loading Spinner for Leaderboard Modal.
 */
export const SmashLeaderboardSkeleton: React.FC<{ count?: number; dict?: Dictionary | any; ariaLabel?: string }> = ({ dict, ariaLabel }) => {
  const loadingLabel = ariaLabel || dict?.smashOrPass?.loadingRankings || dict?.app?.loading || 'Loading rankings...';

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
        dict={dict}
      />
    </div>
  );
};

export default SmashHubSkeleton;
