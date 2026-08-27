// frontend/src/components/streaks/chaos/ChaosProgressBar.tsx
'use client';

import React from 'react';

export interface ChaosProgressBarProps {
  currentStreak: number;
  lastCheckpointStreak: number;
  checkpointInterval: number;
  totalKillers: number;
  dict?: any;
}

export const ChaosProgressBar: React.FC<ChaosProgressBarProps> = ({
  currentStreak,
  lastCheckpointStreak,
  checkpointInterval,
  totalKillers,
  dict,
}) => {
  if (totalKillers <= 0) return null;

  const bankedPct = Math.min(100, (lastCheckpointStreak / totalKillers) * 100);
  const atRiskPct = Math.min(100, (currentStreak / totalKillers) * 100) - bankedPct;

  const ticks: number[] = [];
  if (checkpointInterval > 0) {
    for (let n = checkpointInterval; n < totalKillers; n += checkpointInterval) {
      ticks.push((n / totalKillers) * 100);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {dict?.streaks?.runProgress || 'Run progress'}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono">
          {currentStreak} / {totalKillers} {dict?.streaks?.killersCleared || 'killers cleared'}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500 transition-[width] duration-500"
          style={{ width: `${bankedPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-violet-400/70 transition-[width] duration-500"
          style={{ left: `${bankedPct}%`, width: `${Math.max(0, atRiskPct)}%` }}
        />
        {ticks.map((pct, i) => (
          <div
            key={i}
            className="absolute inset-y-0 w-px bg-slate-500/50 dark:bg-slate-950/60"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  );
};
