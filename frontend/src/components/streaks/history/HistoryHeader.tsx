'use client';
// frontend/src/components/streaks/history/HistoryHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { Flame, Trophy, Shield, Skull, BookOpen, BarChart2, RotateCcw, Gauge, History } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';

const MODE_ICON: Record<HistoryMode, React.ElementType> = {
  medium: Shield,
  hell: Skull,
};

export interface HistoryHeaderProps {
  mode: HistoryMode;
  totalKillersBeaten: number;
  bestKillersBeaten: number;
  checkpointRowIndex: number;
  poolFrozen?: boolean;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenReset: () => void;
  onChangeMode: () => void;
  dict?: Dictionary;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  mode,
  totalKillersBeaten,
  bestKillersBeaten,
  checkpointRowIndex,
  poolFrozen = false,
  onOpenRules,
  onOpenStats,
  onOpenHistory,
  onOpenReset,
  onChangeMode,
  dict,
}) => {
  const ModeIcon = MODE_ICON[mode] ?? Shield;
  const modeLabel = {
    medium: dict?.streaks?.historyMediumLabel || 'Medium',
    hell: dict?.streaks?.historyHellLabel || 'Hell',
  }[mode];

  return (
    <div className="w-full bg-bg-surface border border-border-color rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3">
          <img
            src="/images/streaks/history-streak.jpg"
            alt=""
            className="hidden sm:block h-11 w-11 rounded-xl border border-border-color object-cover shadow-sm"
          />
          <div className="flex flex-col items-center sm:items-start">
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-text-muted capitalize">
              <ModeIcon className="w-4 h-4" />
              {modeLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight text-center sm:text-left">
              {dict?.streaks?.historyStreak || 'History Streak'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          <FreezeBadge frozen={poolFrozen} dict={dict} />
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <Flame className="w-5 h-5 text-text-muted" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.streaks?.killersBeaten || 'Killers beaten'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {totalKillersBeaten}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber shadow-sm">
            <Trophy className="w-5 h-5 text-accent-amber" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.streaks?.best || 'Best'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {bestKillersBeaten}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <Shield className="w-5 h-5 text-text-muted" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.streaks?.checkpointRow || 'Checkpoint row'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {checkpointRowIndex + 1}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-surface text-text-secondary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4 text-text-muted" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </button>

          <button
            onClick={onChangeMode}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-surface text-text-secondary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.changeMode || 'Change Mode'}
          >
            <Gauge className="w-4 h-4 text-text-muted" />
            <span className="hidden sm:inline">{dict?.streaks?.changeMode || 'Change Mode'}</span>
          </button>

          <button
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-surface text-text-secondary border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-surface text-text-secondary border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.pastWins || 'Past Wins'}
          >
            <History className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenReset}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-accent-red/10 text-text-secondary hover:text-accent-red border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.resetRun || 'Reset this run'}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
