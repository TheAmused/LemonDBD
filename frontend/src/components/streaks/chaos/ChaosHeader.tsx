'use client';
// frontend/src/components/streaks/chaos/ChaosHeader.tsx
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { Flame, BarChart2, BookOpen, Layers, RotateCcw, Gauge, History, Flag } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { TierEasyIcon, TierMediumIcon, TierHellIcon, AdeptBadgeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
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
            src="/images/streaks/chaos-streak.webp"
            alt=""
            className="hidden sm:block h-11 w-11 object-contain"
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

          <Button
            variant="secondary"
            size="md"
            onClick={onOpenRules}
            {...tip(dict?.streaks?.rules || 'Rules', undefined, 'action')}
            aria-label={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={onOpenPerkPool}
            {...tip(dict?.streaks?.perkPool || 'Perk Pool', undefined, 'action')}
            aria-label={dict?.streaks?.perkPool || 'Perk Pool'}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.perkPool || 'Perk Pool'}</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={onChangeDifficulty}
            {...tip(dict?.streaks?.changeDifficulty || 'Change Difficulty', undefined, 'action')}
            aria-label={dict?.streaks?.changeDifficulty || 'Change Difficulty'}
          >
            <Gauge className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.changeDifficulty || 'Change Difficulty'}</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon
            onClick={onOpenStats}
            {...tip(dict?.streaks?.stats || 'Statistics', undefined, 'action')}
            aria-label={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" />
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon
            onClick={onOpenHistory}
            {...tip(dict?.streaks?.pastWins || 'Past Wins', undefined, 'action')}
            aria-label={dict?.streaks?.pastWins || 'Past Wins'}
          >
            <History className="w-5 h-5" />
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon
            onClick={onOpenReset}
            {...tip(dict?.streaks?.resetRun || 'Reset this run', undefined, 'action')}
            aria-label={dict?.streaks?.resetRun || 'Reset this run'}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
