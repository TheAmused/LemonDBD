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
    <div className="relative overflow-hidden rounded-3xl border border-orange-500/35 bg-bg-surface p-5 sm:p-6 backdrop-blur-xl shadow-md space-y-4 text-text-primary">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl opacity-30" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-orange-500/15 text-orange-500 dark:text-orange-400">
            <Trophy className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary font-mono">
            {dict?.user?.streakRecords || 'Trial Trophies & Records'}
          </h3>
        </div>

        <Link
          href={`/${currentLocale}/streaks`}
          className="inline-flex items-center gap-1 text-xs font-bold font-mono text-orange-500 dark:text-orange-400 hover:opacity-80 transition-opacity"
        >
          <span>{dict?.sidebar?.streaks || 'Challenges'}</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Streak Trophies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
        {/* Gauntlet Mode */}
        <Link
          href={`/${currentLocale}/streaks/killer/gauntlet-streak`}
          className="flex flex-col justify-between p-4 rounded-2xl border border-border-color bg-bg-elevated/40 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <Skull className="h-4 w-4 text-accent-red" />
              <span className="text-xs font-black font-mono uppercase text-text-primary group-hover:text-orange-500 transition-colors">
                {dict?.user?.gauntletTitle || 'Gauntlet'}
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-text-muted group-hover:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-text-muted font-mono leading-relaxed">
            {dict?.user?.gauntletDesc || 'Consecutive trial victories without duplicate perks.'}
          </p>
        </Link>

        {/* Chaos Shuffle Mode */}
        <Link
          href={`/${currentLocale}/streaks/killer/chaos-streak`}
          className="flex flex-col justify-between p-4 rounded-2xl border border-border-color bg-bg-elevated/40 hover:border-accent-amber/50 hover:bg-accent-amber/5 transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-amber" />
              <span className="text-xs font-black font-mono uppercase text-text-primary group-hover:text-accent-amber transition-colors">
                {dict?.user?.chaosTitle || 'Chaos Shuffle'}
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-text-muted group-hover:text-accent-amber group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-text-muted font-mono leading-relaxed">
            {dict?.user?.chaosDesc || 'Randomized build surviving against unpredictable Entity odds.'}
          </p>
        </Link>

        {/* Page Streak Mode */}
        <Link
          href={`/${currentLocale}/streaks/killer/page-streak`}
          className="flex flex-col justify-between p-4 rounded-2xl border border-border-color bg-bg-elevated/40 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-cyan-500" />
              <span className="text-xs font-black font-mono uppercase text-text-primary group-hover:text-cyan-500 transition-colors">
                {dict?.user?.pageStreakTitle || 'Page Streak'}
              </span>
            </div>
            <ChevronRight className="h-3 w-3 text-text-muted group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-text-muted font-mono leading-relaxed">
            {dict?.user?.pageStreakDesc || 'Progressive tier mastery unlocking all character teachables.'}
          </p>
        </Link>
      </div>
    </div>
  );
};
