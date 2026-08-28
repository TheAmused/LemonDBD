'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserMetricsGrid.tsx

import React from 'react';
import { Shield, Skull, Sparkles } from 'lucide-react';

interface MetricItem {
  owned: number;
  total: number;
  percentage: number;
}

interface OwnershipData {
  survivors?: MetricItem;
  killers?: MetricItem;
  perks?: {
    unlocked: number;
    total: number;
    percentage: number;
  };
}

interface UserMetricsGridProps {
  ownership?: OwnershipData | null;
  dict?: Dictionary;
}

export const UserMetricsGrid: React.FC<UserMetricsGridProps> = ({ ownership, dict }) => {
  const survPercent = ownership?.survivors?.percentage ?? 0;
  const killerPercent = ownership?.killers?.percentage ?? 0;
  const perkPercent = ownership?.perks?.percentage ?? 0;

  const survOwned = ownership?.survivors?.owned ?? 0;
  const survTotal = ownership?.survivors?.total ?? 54;

  const killerOwned = ownership?.killers?.owned ?? 0;
  const killerTotal = ownership?.killers?.total ?? 44;

  const perkUnlocked = ownership?.perks?.unlocked ?? 0;
  const perkTotal = ownership?.perks?.total ?? 321;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 w-full">
      {/* Survivors Metric Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {dict?.stats?.survivors || 'Survivors'}
              </h3>
              <p className="text-sm sm:text-base font-black text-slate-100 font-mono">
                {survOwned} / {survTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-cyan-400 font-mono">
            {survPercent}{'%'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${survPercent}%` }}
          />
        </div>
      </div>

      {/* Killers Metric Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-rose-400">
              <Skull className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {dict?.stats?.killers || 'Killers'}
              </h3>
              <p className="text-sm sm:text-base font-black text-slate-100 font-mono">
                {killerOwned} / {killerTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-rose-400 font-mono">
            {killerPercent}{'%'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
            style={{ width: `${killerPercent}%` }}
          />
        </div>
      </div>

      {/* Teachable Perks Metric Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {dict?.characterDetail?.teachablePerks || 'Teachable Perks'}
              </h3>
              <p className="text-sm sm:text-base font-black text-slate-100 font-mono">
                {perkUnlocked} / {perkTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-400 font-mono">
            {perkPercent}{'%'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${perkPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
