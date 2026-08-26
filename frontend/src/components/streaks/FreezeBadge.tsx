// frontend/src/components/streaks/FreezeBadge.tsx
'use client';

import React from 'react';
import { Snowflake } from 'lucide-react';

export interface FreezeBadgeProps {
  frozen: boolean;
}

/**
 * Small hover-only indicator that a run's roster/perk pool has locked in for
 * the attempt. Uses a custom bubble instead of the native title tooltip so it
 * matches the app's own hover-card styling.
 */
export const FreezeBadge: React.FC<FreezeBadgeProps> = ({ frozen }) => {
  if (!frozen) return null;

  return (
    <div className="relative group flex items-center justify-center shrink-0">
      <div className="freeze-badge-pulse flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-500 dark:text-sky-400 shadow-sm cursor-help">
        <Snowflake className="h-4 w-4" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-sky-500/30 bg-slate-950/95 px-3 py-2.5 text-[11px] leading-snug text-slate-200 opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100">
        <span className="font-bold text-sky-400">Challenge started.</span>{' '}
        Unlocking or locking perks/characters won&apos;t affect this run until a win, a loss back to 0, or a reset.
      </div>
    </div>
  );
};
