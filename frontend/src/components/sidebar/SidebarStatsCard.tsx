// frontend/src/components/sidebar/SidebarStatsCard.tsx
'use client';

import React from 'react';
import { Database, Layers, Users, Shield, Skull } from 'lucide-react';

export interface SidebarStatsCardProps {
  dict: any;
  totalPerksCount: number;
  survivorCount: number;
  killerCount: number;
  characterCount: number;
}

export const SidebarStatsCard: React.FC<SidebarStatsCardProps> = ({
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
    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3 dark:border-slate-800/80 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Database className="h-3 w-3 text-red-500" />
          {dict?.stats?.vaultStats || 'Vault Statistics'}
        </span>
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-2 dark:border-slate-800/60 dark:bg-slate-950/60">
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <Layers className="h-3 w-3" />
            <span className="text-[10px] font-semibold">
              {dict?.stats?.totalPerks || 'Perks'}
            </span>
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
            {totalPerksCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/80 p-2 dark:border-slate-800/60 dark:bg-slate-950/60">
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <Users className="h-3 w-3" />
            <span className="text-[10px] font-semibold">
              {dict?.stats?.characters || 'Cast'}
            </span>
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
            {characterCount}
          </p>
        </div>
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between text-[10px] font-extrabold">
          <span className="text-emerald-500 flex items-center gap-1">
            <Shield className="h-2.5 w-2.5" /> {survivorCount}
          </span>
          <span className="text-slate-400 text-[9px] font-normal">
            {dict?.stats?.ratio || 'Ratio'}
          </span>
          <span className="text-rose-500 flex items-center gap-1">
            {killerCount} <Skull className="h-2.5 w-2.5" />
          </span>
        </div>

        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            style={{ width: `${survivorPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Survivors: ${survivorPct}%`}
          />
          <div
            style={{ width: `${killerPct}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Killers: ${killerPct}%`}
          />
        </div>
      </div>
    </div>
  );
};

