'use client';
// frontend/src/components/streaks/chaos/ChaosHeader.tsx

import React from 'react';
import type { Difficulty } from '@/types/chaosStreak';
import { Flame } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { ChallengeHeaderLayout, HeaderButton, ModeSelectButton, StandardHeaderActions } from '../ChallengePanel';
import { StreakStatTiles } from '../StreakStatTiles';
import { useDictionary } from "@/context/DictionaryContext";
import { TrophyIcon } from '@/components/icons/DbdIcons';

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
  onOpenAbandon: () => void;
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
      onOpenAbandon,
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
            currentIcon={<Flame className="icon-lg" />}
            bestIcon={<TrophyIcon className="icon-lg" />}
          />
          <FreezeBadge frozen={poolFrozen} />
        </>
      }
      actions={
        <StandardHeaderActions
          hasDrawAnimations
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenAbandon={onOpenAbandon}
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
