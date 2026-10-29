'use client';
// frontend/src/components/streaks/id-please/IdPleaseHeader.tsx

import React from 'react';
import { Flame } from 'lucide-react';
import type { IdPleaseDifficulty, IdPleaseSide } from '@/types/idPleaseStreak';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { Img } from '@/components/common/Img';
import { useDictionary } from '@/context/DictionaryContext';
import { ChallengeHeaderLayout, ModeSelectButton, StandardHeaderActions } from '../ChallengePanel';
import { StreakStatTiles } from '../StreakStatTiles';
import { ID_PLEASE_DIFFICULTY_TONE, idPleaseDifficultyImage } from './idPleaseAssets';

export interface IdPleaseHeaderProps {
  difficulty: IdPleaseDifficulty;
  /** The side of the match in play (or the side being set up); the artwork follows it. */
  side: IdPleaseSide;
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
  side,
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
        <>
          <Img
            src={idPleaseDifficultyImage(side, difficulty)}
            alt={s.idPleaseTitle}
            width={56}
            height={56}
            className="hidden h-14 w-14 rounded-control border border-border-color object-cover sm:block"
          />
          <StreakStatTiles
            current={streak}
            best={best}
            currentLabel={s.current}
            bestLabel={s.best}
            currentIcon={<Flame className="h-5 w-5" />}
            bestIcon={<AdeptBadgeIcon className="h-5 w-5" />}
          />
        </>
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
