// frontend/src/components/streaks/page-streak/RunHeader.tsx
'use client';

import React, { useState } from 'react';
import { RotateCcw, Skull } from 'lucide-react';
import { PageStreakRun } from '@/types/pageStreak';

interface RunHeaderProps {
  run: PageStreakRun;
  avatarSrc?: string;
  onOpenReset: () => void;
}

export const RunHeader: React.FC<RunHeaderProps> = ({ run, avatarSrc, onOpenReset }) => {
  const [imgError, setImgError] = useState(false);
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;
  const pct = run.page_count > 0 ? Math.round((cleared / run.page_count) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={run.killer}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Skull className="h-7 w-7 text-slate-400 dark:text-slate-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-100">{run.killer}</h2>
          <div className="mt-1 flex flex-wrap gap-4 font-mono text-[11px] text-slate-500">
            <span>attempt <b className="text-slate-800 dark:text-slate-200">{run.attempt}</b></span>
            <span>best <b className="text-slate-800 dark:text-slate-200">page {run.best_page}</b></span>
            <span>layout frozen <b className="text-slate-800 dark:text-slate-200">{new Date(run.snapshot_at).toLocaleDateString()}</b></span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenReset}
          className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
          title="Reset this streak"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-slate-500">
          <span>
            {run.status === 'completed' ? 'All pages cleared' : `Page ${run.current_page} of ${run.page_count}`}
          </span>
          <span className="tabular-nums font-semibold">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
