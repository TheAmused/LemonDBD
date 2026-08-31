'use client';
// frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Skull } from 'lucide-react';
import type { RosterEntry } from '@/types/pageStreak';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

interface KillerRosterGridProps {
  locale: string;
  roster: RosterEntry[];
  dict?: Dictionary;
}

const KillerPortrait: React.FC<{ name: string; src?: string; done: boolean }> = ({
  name,
  src,
  done,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Skull
          className={`h-7 w-7 ${done
              ? 'text-emerald-500/80 dark:text-emerald-400/70'
              : 'text-slate-400 dark:text-slate-600'
            }`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export const KillerRosterGrid: React.FC<KillerRosterGridProps> = ({
  locale,
  roster,
  dict,
}) => {
  const characterDisplayName = useCharacterDisplayName();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="list">
      {roster.map((entry) => {
        const done = entry.status === 'completed';
        const active = entry.status === 'in_progress';
        const displayName = characterDisplayName(entry.killer);
        const pct =
          entry.page_count > 0
            ? Math.round(((entry.current_page - 1) / entry.page_count) * 100)
            : 0;

        const progressAriaLabel = dict?.streaks?.progress
          ? `${displayName} - ${dict.streaks.progress} ${pct}%`
          : `${displayName} ${pct}%`;

        const activePageText =
          `${dict?.streaks?.pageLabel || dict?.generator?.pageLabel || ''} ${entry.current_page} ${dict?.streaks?.ofLabel || ''} ${entry.page_count}`.trim();

        return (
          <Link
            key={entry.killer}
            href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
            className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${done
                ? 'border-emerald-500/40 bg-emerald-500/[0.07] hover:border-emerald-400/60 ps-complete-pulse'
                : active
                  ? 'border-orange-500/45 bg-orange-500/[0.07] hover:border-orange-400/70'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900/80'
              }`}
          >
            {done && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-950 shadow-sm"
                aria-label={dict?.streaks?.completed || ''}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            <KillerPortrait
              name={displayName}
              src={staticUrl(entry.avatar_local_path)}
              done={done}
            />
            <div className="text-center text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {displayName}
            </div>
            {active && (
              <div
                className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressAriaLabel}
              >
                <div
                  className="h-full rounded-full bg-orange-500 dark:bg-orange-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <div
              className={`text-center font-mono text-[10px] font-semibold ${done
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : active
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
            >
              {done
                ? (dict?.streaks?.completed || '')
                : active
                  ? activePageText
                  : (dict?.streaks?.notStarted || 'Not started')}
            </div>
          </Link>
        );
      })}
    </div>
  );
};