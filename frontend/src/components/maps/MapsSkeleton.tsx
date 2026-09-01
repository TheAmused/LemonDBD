'use client';
// frontend/src/components/maps/MapsSkeleton.tsx

import React from 'react';
import { Search } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface MapsSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
  count?: number;
}

/**
 * Tailored, layout-matched skeleton for the Tactical Maps Explorer (/maps).
 * Matches search/voice switcher, realm search filter, and 2-to-6 column realm cards.
 */
export const MapsPageSkeleton: React.FC<MapsSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
  count = 12,
}) => {
  const loadingLabel = ariaLabel || dict?.maps?.initializingTacticalMap || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`w-full select-none animate-pulse flex flex-col gap-4 ${className}`}
    >
      {/* 1. Search / Voice Mode Switcher Placeholder */}
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit">
        <div className="h-8 w-20 rounded-xl bg-amber-500/20" />
        <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* 2. Search Input Bar Placeholder */}
      <div className="relative w-full max-w-md h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center px-3.5 gap-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>

      {/* 3. Responsive 2-to-6 Column Realm Cards Grid Placeholder */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="group relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between p-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-1">
              <div className="h-4 w-3/4 rounded bg-slate-300 dark:bg-slate-700" />
              <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapsPageSkeleton;
