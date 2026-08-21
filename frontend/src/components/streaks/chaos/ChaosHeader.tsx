// frontend/src/components/streaks/chaos/ChaosHeader.tsx
'use client';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { Coins, Flame, Trophy, Shield, Skull, BarChart2, BookOpen, Layers, RotateCcw } from 'lucide-react';

const DIFFICULTY_ICON: Record<Difficulty, React.ElementType> = {
  easy: Coins,
  medium: Flame,
  hell: Skull,
};

export interface ChaosHeaderProps {
  difficulty: Difficulty;
  currentStreak: number;
  bestStreak: number;
  lastCheckpointStreak: number;
  onOpenStats: () => void;
  onOpenRules: () => void;
  onOpenPerkPool: () => void;
  onOpenReset: () => void;
}

export const ChaosHeader: React.FC<ChaosHeaderProps> = ({
  difficulty,
  currentStreak,
  bestStreak,
  lastCheckpointStreak,
  onOpenStats,
  onOpenRules,
  onOpenPerkPool,
  onOpenReset,
}) => {
  const DifficultyIcon = DIFFICULTY_ICON[difficulty] ?? Skull;

  return (
    <div className="w-full bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/streaks/chaos-streak.jpg"
            alt=""
            className="hidden sm:block h-11 w-11 rounded-xl border border-violet-500/20 object-cover shadow-sm"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
            <DifficultyIcon className="w-6 h-6 text-violet-500" />
            <span className="capitalize">{difficulty}</span> Chaos Streak
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-violet-500/30 text-violet-600 dark:text-violet-400 shadow-sm">
            <Flame className="w-5 h-5 text-violet-500 fill-violet-500/20 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Current
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {currentStreak}
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
                {bestStreak}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Checkpoint
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {lastCheckpointStreak}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-violet-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-violet-400 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title="View Chaos Streak Rules"
          >
            <BookOpen className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span className="hidden sm:inline">Chaos Rules</span>
          </button>

          <button
            onClick={onOpenPerkPool}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-violet-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-violet-400 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title="View this run's perk pool"
          >
            <Layers className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span className="hidden sm:inline">Perk Pool</span>
          </button>

          <button
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="View Chaos Streak Statistics"
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenReset}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Reset this run"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
