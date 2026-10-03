// frontend/src/components/streaks/ChallengeProgress.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Trophy } from 'lucide-react';
import { useDictionary } from "@/context/DictionaryContext";

const NODE_SIZE_PX = 28;

interface ChallengeProgressProps {
  current: number;
  total: number;
  /** Win counts that bank a checkpoint, each between 0 and `total`. The finish is always added as the last trophy. */
  checkpoints: number[];
}

/** Green at the start, amber halfway, red as the run nears its end. */
const fillColor = (ratio: number) =>
  ratio < 0.5
    ? `color-mix(in srgb, var(--accent-amber) ${Math.round(ratio * 200)}%, var(--accent-green))`
    : `color-mix(in srgb, var(--accent-red) ${Math.round((ratio - 0.5) * 200)}%, var(--accent-amber))`;

/** Keeps a node's centre inside the track at both ends instead of hanging off the edge. */
const nodeLeft = (percent: number) => `calc(${percent}% + ${(0.5 - percent / 100) * NODE_SIZE_PX}px)`;

/**
 * Progress through a challenge: a bar that warms from red to green as the run
 * advances, with a trophy at every checkpoint and one at the finish.
 */
export const ChallengeProgress: React.FC<ChallengeProgressProps> = ({ current, total, checkpoints }) => {
  const dict = useDictionary();
  if (total <= 0) return null;

  const cleared = Math.min(current, total);
  const ratio = cleared / total;
  const percent = ratio * 100;
  const trophyPositions = [...checkpoints.filter((c) => c > 0 && c < total), total];

  const s = dict.streaks;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="type-label-sm text-text-primary">
          {s.progressTitle}
        </h3>
        <span className="type-strong text-text-secondary">
          {dict.stats.completed}:{' '}
          <span className="font-extrabold text-accent-green">{cleared}</span> / {total}
        </span>
      </div>

      <div className="pb-6">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={cleared}
          aria-label={s.progressTitle}
          className="relative h-3 rounded-full border border-border-color bg-bg-primary/60"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width,background] duration-700 ease-out"
            style={{
              width: `${percent}%`,
              background: `linear-gradient(90deg, ${fillColor(0)}, ${fillColor(ratio)})`,
              minWidth: cleared > 0 ? `${NODE_SIZE_PX}px` : 0,
            }}
          />

          {trophyPositions.map((pos) => {
            const reached = pos <= cleared;
            return (
              <div
                key={pos}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: nodeLeft((pos / total) * 100) }}
              >
                <div
                  className={`flex items-center justify-center rounded-full border transition-all duration-500 ${
                    reached
                      ? 'border-accent-amber bg-accent-amber text-text-inverted shadow-[0_0_12px_var(--accent-amber)]'
                      : 'border-border-color bg-bg-elevated text-text-muted'
                  }`}
                  style={{ width: NODE_SIZE_PX, height: NODE_SIZE_PX }}
                >
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <span
                  className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 text-mini font-bold ${
                    reached ? 'text-accent-amber' : 'text-text-muted'
                  }`}
                >
                  {pos}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
