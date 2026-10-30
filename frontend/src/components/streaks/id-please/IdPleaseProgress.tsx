'use client';
// frontend/src/components/streaks/id-please/IdPleaseProgress.tsx

import React from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { everyNthCheckpoint } from '@/utils/challengeCheckpoints';
import { formatMessage } from '@/utils/i18nFormat';
import type { IdPleaseBadgeProgress } from '@/types/idPleaseStreak';
import { TrophyIcon } from '@/components/icons/DbdIcons';

/** Where the badge sits on the track; the rest is the endless tail that follows it. */
const BADGE_AT_PERCENT = 62;

interface IdPleaseProgressProps {
  /** What the bar counts: wins towards a streak, or the characters won with out of the characters owned. */
  unit: 'wins' | 'characters';
  /** Null once the badge is earned: the bar is gone for good, the run is simply endless. */
  progress: IdPleaseBadgeProgress | null;
  /** Wins between checkpoints in Milestones, 0 without. Before the badge a single-side run has played exactly one new character per win, so the ticks line up in every lane. */
  checkpointInterval: number;
}

/**
 * The way to the one-time badge, drawn as the first part of a road that never ends: the badge sits partway
 * along the track and a dashed tail with an infinity sign carries on behind it.
 */
export const IdPleaseProgress: React.FC<IdPleaseProgressProps> = ({ unit, progress, checkpointInterval }) => {
  const s = useDictionary().streaks;
  if (!progress || progress.target <= 0) return null;

  const { target } = progress;
  const current = Math.min(progress.current, target);
  const fill = (current / target) * BADGE_AT_PERCENT;
  const counter = formatMessage(unit === 'wins' ? s.idPleaseProgressWins : s.idPleaseProgressCharacters, { current, target });
  const checkpoints = everyNthCheckpoint(checkpointInterval, target);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="type-label-sm text-text-primary">{s.idPleaseProgressTitle}</h3>
        <span className="type-strong tabular-nums text-text-secondary">{counter}</span>
      </div>

      <div className="pb-5 sm:pb-7">
        <progress className="sr-only" value={current} max={target} aria-label={s.idPleaseProgressTitle} />
        <div aria-hidden="true" className="relative h-2 rounded-full bg-bg-primary/60">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent-green transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${fill}%`, minWidth: current > 0 ? '0.5rem' : 0 }}
          />

          {checkpoints.map((count) => (
            <span
              key={count}
              className={`absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${count <= current ? 'bg-accent-amber' : 'bg-border-color'}`}
              style={{ left: `${(count / target) * BADGE_AT_PERCENT}%` }}
            >
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 type-strong-xs text-text-muted max-sm:hidden">{count}</span>
            </span>
          ))}

          <span
            className="absolute inset-y-1/2 right-6 border-t-2 border-dashed border-border-color"
            style={{ left: `${BADGE_AT_PERCENT}%` }}
          />
          <InfinityIcon className="absolute right-0 top-1/2 icon-lg -translate-y-1/2 text-text-muted" />

          <span
            className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent-amber bg-bg-elevated text-accent-amber shadow-glow-amber-sm"
            style={{ left: `${BADGE_AT_PERCENT}%` }}
          >
            <TrophyIcon className="icon-md" />
          </span>
        </div>
      </div>
    </div>
  );
};
