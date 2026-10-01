'use client';
// frontend/src/components/streaks/history/HistoryHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { Flame } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { ChallengeHeaderLayout, ModeSelectButton, StandardHeaderActions } from '../ChallengePanel';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { StreakStatTiles } from '../StreakStatTiles';

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
  dict?: Dictionary;
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
  dict,
}) => {
  const modeLabel = {
    medium: dict?.streaks?.historyMediumLabel || 'Medium',
    hell: dict?.streaks?.historyHellLabel || 'Hell',
  }[mode];

  return (
    <ChallengeHeaderLayout
      stats={
        <>
          <StreakStatTiles
            current={totalKillersBeaten}
            best={bestKillersBeaten}
            currentLabel={dict?.streaks?.current || 'Current'}
            bestLabel={dict?.streaks?.best || 'Best'}
            currentIcon={<Flame className="h-5 w-5" />}
            bestIcon={<AdeptBadgeIcon className="h-5 w-5" />}
          />
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
            <ModeSelectButton
              label={modeLabel}
              tone={MODE_TONE[mode]}
              onClick={onChangeMode}
              title={dict?.streaks?.changeMode || 'Change Mode'}
            />
          }
        />
      }
    />
  );
};
