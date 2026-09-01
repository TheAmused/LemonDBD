'use client';
// frontend/src/components/streaks/StreaksSkeleton.tsx

import React from 'react';
import { Swords, ArrowLeft } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface StreaksSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
}

/**
 * Layout-matched skeleton for the Streaks & Challenges hub (/streaks/killer, /streaks/survivor, etc.).
 * Matches header, role tabs, and responsive 3-column streak card grid.
 */
export const StreaksHubSkeleton: React.FC<StreaksSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.streaks?.loadingStreak || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`w-full select-none animate-pulse ${className}`}
    >
      {/* 1. Header Placeholder */}
      <header className="mb-6 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500/50 border border-orange-500/20">
          <Swords className="h-4 w-4" />
        </span>
        <div className="h-7 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
      </header>

      {/* 2. Role Navigation Tabs Placeholder */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60" />
        <div className="h-10 w-24 rounded-xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60" />
        <div className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60" />
      </div>

      {/* 3. Responsive 3-Column Streak Panels Placeholder */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
              <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-slate-300 dark:bg-slate-700" />
              <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Layout-matched skeleton for active in-progress streak boards (Gauntlet, Chaos, History, Page).
 */
export const StreakBoardSkeleton: React.FC<StreaksSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.streaks?.loadingStreak || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`w-full select-none animate-pulse space-y-6 ${className}`}
    >
      {/* Back Link Placeholder */}
      <div className="inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Board Header Placeholder */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-5 w-40 rounded bg-slate-300 dark:bg-slate-700" />
            <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Central Stage Placeholder */}
      <div className="h-72 w-full rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
        <div className="h-28 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
};

export default StreaksHubSkeleton;
