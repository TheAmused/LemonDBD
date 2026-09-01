'use client';
// frontend/src/components/PerksSkeleton.tsx

import React from 'react';
import { Shield, Skull, Search, LayoutGrid, List } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface PerksSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
  count?: number;
}

/**
 * Tailored, layout-matched skeleton for the Perks Vault (/perks).
 * Matches exact 5x3 diamond grid layout, filters bar, and pagination footer.
 */
export const PerksGridSkeleton: React.FC<PerksSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
  count = 15,
}) => {
  const loadingLabel = ariaLabel || dict?.filters?.loadingPerks || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden select-none animate-pulse gap-3 sm:gap-4 ${className}`}
    >
      {/* 1. Top Filters Toolbar Placeholder */}
      <section className="shrink-0 space-y-3 p-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Role Switcher Placeholder */}
          <div className="relative flex items-center w-full sm:w-64 h-11 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner">
            <div className="flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl bg-slate-800/80">
              <Shield className="h-3.5 w-3.5 text-emerald-500/40" />
              <div className="h-3.5 w-16 bg-slate-700/60 rounded" />
            </div>
            <div className="flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl">
              <Skull className="h-3.5 w-3.5 text-rose-500/40" />
              <div className="h-3.5 w-14 bg-slate-800/60 rounded" />
            </div>
          </div>

          {/* Search Bar Placeholder */}
          <div className="relative flex-1 min-w-[200px] h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center px-3.5 gap-2">
            <Search className="h-4 w-4 text-slate-700" />
            <div className="h-3 w-28 bg-slate-800 rounded" />
          </div>

          {/* View Mode & Sort Placeholders */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 rounded-2xl bg-slate-900 border border-slate-800" />
            <div className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-800" />
          </div>
        </div>
      </section>

      {/* 2. 5x3 Diamond Perk Cards Grid Placeholder */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="grid min-h-0 w-full flex-1 grid-cols-5 gap-3">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-center p-1">
              <div className="aspect-square h-[88%] w-[88%] max-h-48 max-w-48 rotate-45 animate-pulse rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-md flex items-center justify-center">
                <div className="-rotate-45 h-8 w-8 rounded-lg bg-slate-800/40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Pagination Footer Placeholder */}
      <footer className="shrink-0 flex items-center justify-between p-2 border-t border-slate-800/60">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </footer>
    </div>
  );
};

export default PerksGridSkeleton;
