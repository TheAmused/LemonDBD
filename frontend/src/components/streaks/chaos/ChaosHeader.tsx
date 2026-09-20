'use client';
// frontend/src/components/streaks/chaos/ChaosHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { Flame, BarChart2, BookOpen, Layers, RotateCcw, Gauge, History, Flag } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { TierEasyIcon, TierMediumIcon, TierHellIcon, AdeptBadgeIcon } from '@/components/icons/DbdIcons';

const DIFFICULTY_ICON: Record<Difficulty, React.ElementType> = {
  easy: TierEasyIcon,
  medium: TierMediumIcon,
  hell: TierHellIcon,
};

export interface ChaosHeaderProps {
  difficulty: Difficulty;
  currentStreak: number;
  bestStreak: number;
  lastCheckpointStreak: number;
  poolFrozen?: boolean;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenRules: () => void;
  onOpenPerkPool: () => void;
  onOpenReset: () => void;
  onChangeDifficulty: () => void;
  dict?: Dictionary;
}

export const ChaosHeader: React.FC<ChaosHeaderProps> = ({
  difficulty,
  currentStreak,
  bestStreak,
  lastCheckpointStreak,
  poolFrozen = false,
  onOpenStats,
  onOpenHistory,
  onOpenRules,
  onOpenPerkPool,
  onOpenReset,
  onChangeDifficulty,
  dict,
}) => {
  const DifficultyIcon = DIFFICULTY_ICON[difficulty] ?? TierHellIcon;
  const difficultyLabel = {
    easy: dict?.streaks?.chaosEasyLabel || 'Easy',
    medium: dict?.streaks?.chaosMediumLabel || 'Medium',
    hell: dict?.streaks?.chaosHellLabel || 'Hell',
  }[difficulty];

  return (
    <div className="w-full bg-bg-surface/90 border border-border-color rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/streaks/chaos-streak.jpg"
            alt=""
            className="hidden sm:block h-11 w-11 rounded-xl border border-border-color object-cover shadow-sm"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-2 justify-center sm:justify-start">
            <DifficultyIcon className="w-6 h-6 text-accent-red" />
            <span className="capitalize">{difficultyLabel}</span> {dict?.streaks?.chaosStreak || 'Chaos Streak'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          <FreezeBadge frozen={poolFrozen} dict={dict} />
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <Flame className="w-5 h-5 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.streaks?.current || 'Current'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {currentStreak}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <AdeptBadgeIcon className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.streaks?.best || 'Best'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {bestStreak}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <Flag className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.streaks?.checkpointHeader || 'Checkpoint'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {lastCheckpointStreak}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </button>

          <button
            onClick={onOpenPerkPool}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.perkPool || 'Perk Pool'}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.perkPool || 'Perk Pool'}</span>
          </button>

          <button
            onClick={onChangeDifficulty}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.changeDifficulty || 'Change Difficulty'}
          >
            <Gauge className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.changeDifficulty || 'Change Difficulty'}</span>
          </button>

          <button
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary border border-border-color transition-colors shadow-sm cursor-pointer"
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
