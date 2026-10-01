'use client';
// frontend/src/components/streaks/chaos/ChaosHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { Flame } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { ChallengeHeaderLayout, HeaderButton, ModeSelectButton, StandardHeaderActions, StatTile } from '../ChallengePanel';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

const DIFFICULTY_TONE = { easy: 'green', medium: 'amber', hell: 'red' } as const;

export interface ChaosHeaderProps {
  difficulty: Difficulty;
  currentStreak: number;
  bestStreak: number;
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
  poolFrozen = false,
  onOpenStats,
  onOpenHistory,
  onOpenRules,
  onOpenPerkPool,
  onOpenReset,
  onChangeDifficulty,
  dict,
}) => {
  const difficultyLabel = {
    easy: dict?.streaks?.chaosEasyLabel || 'Easy',
    medium: dict?.streaks?.chaosMediumLabel || 'Medium',
    hell: dict?.streaks?.chaosHellLabel || 'Hell',
  }[difficulty];

  return (
    <ChallengeHeaderLayout
      stats={
        <>
          <StatTile icon={<Flame className="h-5 w-5" />} label={dict?.streaks?.current || 'Current'} value={currentStreak} />
          <StatTile icon={<AdeptBadgeIcon className="h-5 w-5" />} label={dict?.streaks?.best || 'Best'} value={bestStreak} />
          <FreezeBadge frozen={poolFrozen} dict={dict} />
        </>
      }
      actions={
        <StandardHeaderActions
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenReset={onOpenReset}
          dict={dict}
          extra={
            <>
              <HeaderButton
                onClick={onOpenPerkPool}
                title={dict?.streaks?.perkPool || 'Perk Pool'}
                label={dict?.streaks?.perkPool || 'Perk Pool'}
              />
              <ModeSelectButton
                label={difficultyLabel}
                tone={DIFFICULTY_TONE[difficulty]}
                onClick={onChangeDifficulty}
                title={dict?.streaks?.changeDifficulty || 'Change Difficulty'}
              />
            </>
          }
        />
      }
    />
  );
};
