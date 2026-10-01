'use client';
// frontend/src/components/streaks/chaos/ChaosHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { Flame, BookOpen, Layers, Gauge, Flag } from 'lucide-react';
import { StreakHeader } from '../StreakHeader';
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
  const s = dict?.streaks;
  const DifficultyIcon = DIFFICULTY_ICON[difficulty] ?? TierHellIcon;
  const difficultyLabel = {
    easy: s?.chaosEasyLabel || 'Easy',
    medium: s?.chaosMediumLabel || 'Medium',
    hell: s?.chaosHellLabel || 'Hell',
  }[difficulty];

  return (
    <StreakHeader
      variant="roomy"
      imageSrc="/images/streaks/chaos-streak.webp"
      title={
        <>
          <DifficultyIcon className="w-6 h-6 text-accent-red" />
          <span className="capitalize">{difficultyLabel}</span> {s?.chaosStreak || 'Chaos Streak'}
        </>
      }
      poolFrozen={poolFrozen}
      stats={[
        { key: 'current', label: s?.current || 'Current', value: currentStreak, icon: <Flame className="w-5 h-5 animate-pulse" /> },
        { key: 'best', label: s?.best || 'Best', value: bestStreak, icon: <AdeptBadgeIcon className="w-5 h-5" /> },
        { key: 'checkpoint', label: s?.checkpointHeader || 'Checkpoint', value: lastCheckpointStreak, icon: <Flag className="w-5 h-5" /> },
      ]}
      actions={[
        { key: 'rules', label: s?.rules || 'Rules', icon: <BookOpen className="w-4 h-4" />, onClick: onOpenRules },
        { key: 'perkPool', label: s?.perkPool || 'Perk Pool', icon: <Layers className="w-4 h-4" />, onClick: onOpenPerkPool },
        { key: 'difficulty', label: s?.changeDifficulty || 'Change Difficulty', icon: <Gauge className="w-4 h-4" />, onClick: onChangeDifficulty },
      ]}
      onOpenStats={onOpenStats}
      onOpenHistory={onOpenHistory}
      onOpenReset={onOpenReset}
      dict={dict}
    />
  );
};
