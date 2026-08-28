'use client';
// frontend/src/components/streaks/page-streak/RunHeader.tsx

import React, { useState } from 'react';
import { RotateCcw, Skull, Flame, Trophy, BookOpen, BarChart2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { PageStreakRun } from '@/types/pageStreak';
import { FreezeBadge } from '../FreezeBadge';

interface RunHeaderProps {
  run: PageStreakRun;
  avatarSrc?: string;
  onOpenReset: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  dict?: Dictionary;
}

export const RunHeader: React.FC<RunHeaderProps> = ({
  run,
  avatarSrc,
  onOpenReset,
  onOpenRules,
  onOpenStats,
  dict,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;
  const pct = run.page_count > 0 ? Math.round((cleared / run.page_count) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={run.killer}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Skull className="h-7 w-7 text-slate-400 dark:text-slate-600" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-100">
            {run.killer}
          </h2>
          <div className="mt-1 flex flex-wrap gap-4 font-mono text-[11px] text-slate-500">
            <span>
              {dict?.streaks?.attempt || 'attempt'}{' '}
              <b className="text-slate-800 dark:text-slate-200">{run.attempt}</b>
            </span>
            {run.pool_frozen && (
              <span>
                {dict?.streaks?.layoutFrozen || 'layout frozen'}{' '}
                <b className="text-slate-800 dark:text-slate-200">
                  {new Date(run.snapshot_at).toLocaleDateString()}
                </b>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <FreezeBadge frozen={run.pool_frozen} dict={dict} />
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-sm">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                {dict?.stats?.current || 'Current'}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {cleared}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 shadow-sm">
            <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                {dict?.stats?.best || 'Best'}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {run.best_page}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-orange-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-orange-400 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title={dict?.streaks?.rules || 'Rules'}
            aria-label={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4 text-orange-500 dark:text-orange-400" aria-hidden="true" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title={dict?.streaks?.stats || 'Statistics'}
            aria-label={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenReset}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title={dict?.streaks?.resetRun || 'Reset this streak'}
            aria-label={dict?.streaks?.resetRun || 'Reset this streak'}
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-slate-500">
          <span>
            {run.status === 'completed'
              ? (dict?.streaks?.allPagesCleared || 'All pages cleared')
              : `${dict?.streaks?.pageLabel || 'Page'} ${run.current_page} ${dict?.streaks?.ofLabel || 'of'} ${run.page_count}`}
          </span>
          <span className="tabular-nums font-semibold">{pct}{dict?.streaks?.percentSign || '%'}</span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${dict?.stats?.progress || 'Progress'}: ${pct}%`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

