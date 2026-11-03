'use client';
// frontend/src/components/streaks/id-please/IdPleaseProgress.tsx

import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { everyNthCheckpoint } from '@/utils/challengeCheckpoints';
import { formatMessage } from '@/utils/i18nFormat';
import type { IdPleaseBadgeProgress } from '@/types/idPleaseStreak';
import { ChallengeProgress } from '../ChallengeProgress';

interface IdPleaseProgressProps {
  /** What the bar counts: wins towards a streak, or the characters won with out of the characters owned. */
  unit: 'wins' | 'characters';
  /** Null once the badge is earned: the bar is gone for good, the run is simply endless. */
  progress: IdPleaseBadgeProgress | null;
  /** Wins between checkpoints in Milestones, 0 without. Before the badge a single-side run has played exactly one new character per win, so the ticks line up in every lane. */
  checkpointInterval: number;
}

/** The way to the one-time badge: the shared challenge bar, drawn as the first part of a road that never ends. */
export const IdPleaseProgress: React.FC<IdPleaseProgressProps> = ({ unit, progress, checkpointInterval }) => {
  const s = useDictionary().streaks;
  if (!progress || progress.target <= 0) return null;

  const { target } = progress;
  const current = Math.min(progress.current, target);

  return (
    <ChallengeProgress
      current={current}
      total={target}
      checkpoints={everyNthCheckpoint(checkpointInterval, target)}
      title={s.idPleaseProgressTitle}
      counter={formatMessage(unit === 'wins' ? s.idPleaseProgressWins : s.idPleaseProgressCharacters, { current, target })}
      endless
    />
  );
};
