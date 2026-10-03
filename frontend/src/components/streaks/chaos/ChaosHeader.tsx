'use client';
// frontend/src/components/streaks/chaos/ChaosHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { Flame } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { ChallengeHeaderLayout, HeaderButton, ModeSelectButton, StandardHeaderActions } from '../ChallengePanel';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { StreakStatTiles } from '../StreakStatTiles';
import { useDictionary } from "@/context/DictionaryContext";

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
    }) => {
  const dict = useDictionary();
  const difficultyLabel = {
    easy: dict.streaks.chaosEasyLabel,
    medium: dict.streaks.chaosMediumLabel,
    hell: dict.streaks.chaosHellLabel,
  }[difficulty];

  return (
    <ChallengeHeaderLayout
      stats={
        <>
          <StreakStatTiles
            current={currentStreak}
            best={bestStreak}
            currentLabel={dict.streaks.current}
            bestLabel={dict.streaks.best}
            currentIcon={<Flame className="h-5 w-5" />}
            bestIcon={<AdeptBadgeIcon className="h-5 w-5" />}
          />
          <FreezeBadge frozen={poolFrozen} />
        </>
      }
      actions={
        <StandardHeaderActions
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenReset={onOpenReset}
          modeSelect={
            <ModeSelectButton
              label={difficultyLabel}
              tone={DIFFICULTY_TONE[difficulty]}
              onClick={onChangeDifficulty}
              title={dict.streaks.changeDifficulty}
            />
          }
          extra={
            <HeaderButton
              onClick={onOpenPerkPool}
              title={dict.streaks.perkPool}
              label={dict.streaks.perkPool}
            />
          }
        />
      }
    />
  );
};
