'use client';
// frontend/src/components/streaks/history/HistoryHeader.tsx
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { Flame } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { ChallengeHeaderLayout, ModeSelectButton, StandardHeaderActions } from '../ChallengePanel';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { StreakStatTiles } from '../StreakStatTiles';
import { useDictionary } from "@/context/DictionaryContext";

const MODE_TONE = { medium: 'amber', hell: 'red' } as const;

export interface HistoryHeaderProps {
  mode: HistoryMode;
  totalKillersBeaten: number;
  bestKillersBeaten: number;
  poolFrozen?: boolean;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenReset: () => void;
  onChangeMode: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
      mode,
      totalKillersBeaten,
      bestKillersBeaten,
      poolFrozen = false,
      onOpenRules,
      onOpenStats,
      onOpenHistory,
      onOpenReset,
      onChangeMode,
    }) => {
  const dict = useDictionary();
  const modeLabel = {
    medium: dict.streaks.historyMediumLabel,
    hell: dict.streaks.historyHellLabel,
  }[mode];

  return (
    <ChallengeHeaderLayout
      stats={
        <>
          <StreakStatTiles
            current={totalKillersBeaten}
            best={bestKillersBeaten}
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
              label={modeLabel}
              tone={MODE_TONE[mode]}
              onClick={onChangeMode}
              title={dict.streaks.changeMode}
            />
          }
        />
      }
    />
  );
};
