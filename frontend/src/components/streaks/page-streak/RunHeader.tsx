'use client';
// frontend/src/components/streaks/page-streak/RunHeader.tsx

import React, { useState } from 'react';
import { RotateCcw, Flame, BookOpen, BarChart2, History } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { PageStreakRun } from '@/types/pageStreak';
import { FreezeBadge } from '../FreezeBadge';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { KillerIcon } from '@/components/icons/DbdIcons';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

interface RunHeaderProps {
  run: PageStreakRun;
  avatarSrc?: string;
  onOpenReset: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  dict?: Dictionary;
}

export const RunHeader: React.FC<RunHeaderProps> = ({
  run,
  avatarSrc,
  onOpenReset,
  onOpenRules,
  onOpenStats,
  onOpenHistory,
  dict,
}) => {
  const killerDisplayName = useCharacterDisplayName()(run.killer);
  const [imgError, setImgError] = useState<boolean>(false);
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;
  const pct = run.page_count > 0 ? Math.round((cleared / run.page_count) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-sm">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={killerDisplayName}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <KillerIcon className="h-7 w-7 text-text-muted" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold tracking-wide text-text-primary">
            {killerDisplayName}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <FreezeBadge frozen={run.pool_frozen} dict={dict} />
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-accent-red/30 text-accent-red shadow-sm">
            <Flame className="w-5 h-5 text-accent-red fill-accent-red/20" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.stats?.current || 'Current'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {cleared}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-bg-elevated border border-accent-amber/30 text-accent-amber shadow-sm">
            <AdeptBadgeIcon className="w-5 h-5 text-accent-amber" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold leading-none">
                {dict?.stats?.best || 'Best'}
              </span>
              <span className="text-lg font-black text-text-primary leading-none mt-0.5 font-mono">
                {run.best_page}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            title={dict?.streaks?.rules || 'Rules'}
            aria-label={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            title={dict?.streaks?.stats || 'Statistics'}
            aria-label={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            title={dict?.streaks?.pastWins || 'Past Wins'}
            aria-label={dict?.streaks?.pastWins || 'Past Wins'}
          >
            <History className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenReset}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-accent-red/10 text-text-secondary hover:text-accent-red border border-border-color transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            title={dict?.streaks?.resetRun || 'Reset this streak'}
            aria-label={dict?.streaks?.resetRun || 'Reset this streak'}
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-text-muted">
          <span>
            {run.status === 'completed'
              ? (dict?.streaks?.allPagesCleared || 'All pages cleared')
              : `${dict?.streaks?.pageLabel || 'Page'} ${run.current_page} ${dict?.streaks?.ofLabel || 'of'} ${run.page_count}`}
          </span>
          <span className="tabular-nums font-semibold">{pct}{dict?.streaks?.percentSign || '%'}</span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-elevated"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${dict?.stats?.progress || 'Progress'}: ${pct}%`}
        >
          <div
            className="h-full rounded-full bg-accent-red transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

