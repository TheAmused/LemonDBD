// frontend/src/components/streaks/ChallengeProgress.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useDictionary } from "@/context/DictionaryContext";

const MAX_NODE_PX = 28;
const MIN_NODE_PX = 14;
/** Share of the space between two trophies a trophy may fill, so the track stays visible between them. */
const NODE_FILL_RATIO = 0.7;
/** Free space kept between two neighbouring trophies; one that would leave less is dropped. */
const MIN_NODE_GAP_PX = 6;

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
const nodeLeft = (percent: number, nodeSize: number) => `calc(${percent}% + ${(0.5 - percent / 100) * nodeSize}px)`;

/** Trophy size from the typical spacing (the median, so a crowded finish does not shrink them all). */
const nodeSizeFor = (positions: number[], total: number, trackPx: number): number => {
  if (trackPx <= 0 || positions.length < 2) return MAX_NODE_PX;
  const gaps = positions.slice(1).map((pos, i) => ((pos - positions[i]) / total) * trackPx).sort((x, y) => x - y);
  const typical = gaps[Math.floor(gaps.length / 2)];
  return Math.max(MIN_NODE_PX, Math.min(MAX_NODE_PX, Math.floor(typical * NODE_FILL_RATIO)));
};

/** Trophies that fit the track: walking back from the finish, drops any that would crowd the next one. */
const fittingPositions = (positions: number[], total: number, trackPx: number, nodeSize: number): number[] => {
  if (trackPx <= 0) return positions;
  const kept: number[] = [];
  for (let i = positions.length - 1; i >= 0; i--) {
    const last = kept[0];
    if (last === undefined || ((last - positions[i]) / total) * trackPx >= nodeSize + MIN_NODE_GAP_PX) kept.unshift(positions[i]);
  }
  return kept;
};

/**
 * Progress through a challenge: a bar that warms from red to green as the run
 * advances, with a trophy at every checkpoint and one at the finish.
 */
export const ChallengeProgress: React.FC<ChallengeProgressProps> = ({ current, total, checkpoints }) => {
  const dict = useDictionary();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackPx, setTrackPx] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackPx(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [total]);

  if (total <= 0) return null;

  const cleared = Math.min(current, total);
  const ratio = cleared / total;
  const percent = ratio * 100;
  const allPositions = [...checkpoints.filter((c) => c > 0 && c < total), total];
  const nodeSize = nodeSizeFor(allPositions, total, trackPx);
  const trophyPositions = fittingPositions(allPositions, total, trackPx, nodeSize);

  const s = dict.streaks;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 sm:mb-4">
        <h3 className="type-label-sm text-text-primary">
          {s.progressTitle}
        </h3>
        <span className="type-strong text-text-secondary">
          {dict.stats.completed}:{' '}
          <span className="font-extrabold text-accent-green">{cleared}</span> / {total}
        </span>
      </div>

      <div className="pb-2.5 sm:pb-7">
        <div
          ref={trackRef}
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
              minWidth: cleared > 0 ? `${nodeSize}px` : 0,
            }}
          />

          {trophyPositions.map((pos) => {
            const reached = pos <= cleared;
            return (
              <div
                key={pos}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: nodeLeft((pos / total) * 100, nodeSize) }}
              >
                <div
                  className={`flex items-center justify-center rounded-full border transition-all duration-500 ${
                    reached
                      ? 'border-accent-amber bg-accent-amber text-text-inverted shadow-[0_0_12px_var(--accent-amber)]'
                      : 'border-border-color bg-bg-elevated text-text-muted'
                  }`}
                  style={{ width: nodeSize, height: nodeSize }}
                >
                  <Trophy style={{ width: nodeSize * 0.5, height: nodeSize * 0.5 }} aria-hidden="true" />
                </div>
                <span
                  className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 text-mini font-bold max-sm:hidden ${
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
