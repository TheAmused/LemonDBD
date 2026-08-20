// frontend/src/components/streaks/history/HistoryHeader.tsx
'use client';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { Flame, Trophy, Shield, Skull, BookOpen, BarChart2 } from 'lucide-react';

const MODE_ICON: Record<HistoryMode, React.ElementType> = {
  medium: Shield,
  hell: Skull,
};

export interface HistoryHeaderProps {
  mode: HistoryMode;
  totalKillersBeaten: number;
  bestKillersBeaten: number;
  checkpointRowIndex: number;
  onOpenRules: () => void;
  onOpenStats: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  mode,
  totalKillersBeaten,
  bestKillersBeaten,
  checkpointRowIndex,
  onOpenRules,
  onOpenStats,
}) => {
  const ModeIcon = MODE_ICON[mode] ?? Shield;

  return (
    <div className="w-full bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/streaks/history-streak.jpg"
            alt=""
            className="hidden sm:block h-11 w-11 rounded-xl border border-slate-400/30 object-cover shadow-sm"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
            <ModeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            <span className="capitalize">{mode}</span> History Streak
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-400/30 text-slate-600 dark:text-slate-300 shadow-sm">
            <Flame className="w-5 h-5 text-slate-500 fill-slate-500/20" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Killers beaten
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {totalKillersBeaten}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 shadow-sm">
            <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Best
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {bestKillersBeaten}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Checkpoint row
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {checkpointRowIndex + 1}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title="View History Streak Rules"
          >
            <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">History Rules</span>
          </button>

          <button
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="View History Streak Statistics"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
