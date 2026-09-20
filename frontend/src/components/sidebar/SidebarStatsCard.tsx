'use client';
// frontend/src/components/sidebar/SidebarStatsCard.tsx

import React from 'react';
import { Database, Layers, Users } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

export interface SidebarStatsCardProps {
  dict?: Dictionary;
  totalPerksCount: number;
  survivorCount: number;
  killerCount: number;
  characterCount: number;
}

const SidebarStatsCardBase: React.FC<SidebarStatsCardProps> = ({
  dict,
  totalPerksCount,
  survivorCount,
  killerCount,
  characterCount,
}) => {
  const safeTotal = survivorCount + killerCount || 1;
  const survivorPct = Math.round((survivorCount / safeTotal) * 100);
  const killerPct = 100 - survivorPct;

  return (
    <div className="mt-3 rounded-2xl border border-border-color bg-bg-elevated p-3 backdrop-blur-sm shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Database className="h-3 w-3 text-accent-red" aria-hidden="true" />
          {dict?.stats?.vaultStats || 'Vault Statistics'}
        </span>
        <span className="flex h-2 w-2 rounded-full bg-accent-green animate-pulse" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="rounded-xl border border-border-color bg-bg-surface p-2">
          <div className="flex items-center gap-1 text-text-muted mb-0.5">
            <Layers className="h-3 w-3" aria-hidden="true" />
            <span className="text-[10px] font-semibold">
              {dict?.stats?.totalPerks || 'Perks'}
            </span>
          </div>
          <p className="text-sm font-black text-text-primary font-mono">
            {totalPerksCount}
          </p>
        </div>

        <div className="rounded-xl border border-border-color bg-bg-surface p-2">
          <div className="flex items-center gap-1 text-text-muted mb-0.5">
            <Users className="h-3 w-3" aria-hidden="true" />
            <span className="text-[10px] font-semibold">
              {dict?.stats?.characters || 'Cast'}
            </span>
          </div>
          <p className="text-sm font-black text-text-primary font-mono">
            {characterCount}
          </p>
        </div>
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between text-[10px] font-extrabold">
          <span className="text-accent-green flex items-center gap-1">
            <SurvivorIcon className="h-2.5 w-2.5" aria-hidden="true" /> {survivorCount}
          </span>
          <span className="text-text-muted text-[9px] font-normal">
            {dict?.stats?.ratio || 'Ratio'}
          </span>
          <span className="text-accent-red flex items-center gap-1">
            {killerCount} <KillerIcon className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        </div>

        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-surface"
          role="progressbar"
          aria-valuenow={survivorPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${dict?.stats?.ratio || 'Survivor to Killer ratio'}: ${survivorPct}% ${dict?.generator?.survivor || 'Survivors'}, ${killerPct}% ${dict?.generator?.killer || 'Killers'}`}
        >
          <div
            style={{ width: `${survivorPct}%` }}
            className="bg-accent-green transition-all duration-500"
            title={`${dict?.generator?.survivor || 'Survivors'}: ${survivorPct}%`}
          />
          <div
            style={{ width: `${killerPct}%` }}
            className="bg-accent-red transition-all duration-500"
            title={`${dict?.generator?.killer || 'Killers'}: ${killerPct}%`}
          />
        </div>
      </div>
    </div>
  );
};

/** Memoised: the sidebar re-renders with every page, but these props
    only change when the route or the dictionary does. */
export const SidebarStatsCard = React.memo(SidebarStatsCardBase);
