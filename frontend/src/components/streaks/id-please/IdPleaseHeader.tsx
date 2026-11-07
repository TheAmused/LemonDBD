'use client';
// frontend/src/components/streaks/id-please/IdPleaseHeader.tsx

import React from 'react';
import { Flame } from 'lucide-react';
import type { IdPleaseDifficulty } from '@/types/idPleaseStreak';
import { useDictionary } from '@/context/DictionaryContext';
import { ChallengeHeaderLayout, ModeSelectButton, StandardHeaderActions } from '../ChallengePanel';
import { StreakStatTiles } from '../StreakStatTiles';
import { ID_PLEASE_DIFFICULTY_TONE } from './idPleaseAssets';
import { TrophyIcon } from '@/components/icons/DbdIcons';

export interface IdPleaseHeaderProps {
  difficulty: IdPleaseDifficulty;
  streak: number;
  best: number;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenAbandon: () => void;
  onChangeMode: () => void;
}

export const IdPleaseHeader: React.FC<IdPleaseHeaderProps> = ({
  difficulty,
  streak,
  best,
  onOpenRules,
  onOpenStats,
  onOpenHistory,
  onOpenAbandon,
  onChangeMode,
}) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const label = {
    milestones: s.idPleaseMilestonesLabel,
    hardcore: s.idPleaseHardcoreLabel,
    hardcore_plus: s.idPleaseHardcorePlusLabel,
  }[difficulty];

  return (
    <ChallengeHeaderLayout
      stats={
        <StreakStatTiles
          current={streak}
          best={best}
          currentLabel={s.current}
          bestLabel={s.best}
          currentIcon={<Flame className="icon-lg" />}
          bestIcon={<TrophyIcon className="icon-lg" />}
        />
      }
      actions={
        <StandardHeaderActions
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenAbandon={onOpenAbandon}
          modeSelect={
            <ModeSelectButton label={label} tone={ID_PLEASE_DIFFICULTY_TONE[difficulty]} onClick={onChangeMode} title={s.changeMode} />
          }
        />
      }
    />
  );
};
