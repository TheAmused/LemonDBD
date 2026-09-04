// frontend/src/components/user/StreakTrophyCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Flame, Zap, ChevronRight, Repeat, Skull, Shield } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface StreakTrophyCardProps {
  currentLocale: string;
  dict?: Dictionary | null;
}

export const StreakTrophyCard: React.FC<StreakTrophyCardProps> = ({
  currentLocale,
  dict,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-950/20 via-slate-900/80 to-slate-950/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
            <Trophy className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono">
            {dict?.user?.streakRecords || 'Trial Trophies & Records'}
          </h3>
        </div>

        <Link
          href={`/${currentLocale}/streaks`}
          className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
        >
          <span>{dict?.sidebar?.streaks || 'Challenges'}</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Streak Trophies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Gauntlet Mode */}
        <Link
          href={`/${currentLocale}/streaks/gauntlet`}
          className="flex flex-col justify-between p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Skull className="h-4 w-4 text-red-400" />
              <span className="text-xs font-extrabold uppercase text-slate-300 group-hover:text-orange-400 transition-colors">
                Gauntlet
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Consecutive trial victories without duplicate perks.
          </p>
        </Link>

        {/* Chaos Shuffle Mode */}
        <Link
          href={`/${currentLocale}/streaks/chaos`}
          className="flex flex-col justify-between p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-extrabold uppercase text-slate-300 group-hover:text-amber-400 transition-colors">
                Chaos Shuffle
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Randomized build surviving against unpredictable Entity odds.
          </p>
        </Link>

        {/* Page Streak Mode */}
        <Link
          href={`/${currentLocale}/streaks/page`}
          className="flex flex-col justify-between p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-extrabold uppercase text-slate-300 group-hover:text-cyan-400 transition-colors">
                Page Streak
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Progressive tier mastery unlocking all character teachables.
          </p>
        </Link>
      </div>
    </div>
  );
};
