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
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-bg-elevated border border-border-color">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Skull
          className={`h-7 w-7 ${done ? 'text-accent-green/80' : 'text-text-muted'}`}
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
        // ever_completed comes from the persistent completion history, so it
        // survives a per-killer reset (which flips status back to in_progress).
        // status === 'completed' stays as a fallback for older data.
        const done = entry.ever_completed || entry.status === 'completed';
        const active = entry.status === 'in_progress';
        const displayName = characterDisplayName(entry.killer);
        const cleared = entry.status === 'not_started' ? 0 : Math.max(0, entry.current_page - 1);
        const pct = entry.page_count > 0 ? Math.round((cleared / entry.page_count) * 100) : 0;

        const progressAriaLabel = dict?.streaks?.progress
          ? `${displayName} - ${dict.streaks.progress} ${pct}%`
          : `${displayName} ${pct}%`;

        const progressText =
          `${cleared} ${dict?.streaks?.ofLabel || 'of'} ${entry.page_count} ${dict?.streaks?.pagesCount || 'pages'}`.trim();

        return (
          <Link
            key={entry.killer}
            href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
            className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-red ${done
                ? 'border-accent-green/40 bg-accent-green/[0.07] hover:border-accent-green/60 ps-complete-pulse'
                : active
                  ? 'border-accent-amber/45 bg-accent-amber/[0.07] hover:border-accent-amber/70'
                  : 'border-border-color bg-bg-surface hover:border-border-color hover:bg-bg-elevated'
              }`}
          >
            {done && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-green text-text-inverted shadow-sm"
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
            <div className="text-center text-xs font-bold text-text-secondary truncate">
              {displayName}
            </div>
            {!done && (
              <div
                className="h-1 overflow-hidden rounded-full bg-bg-elevated"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressAriaLabel}
              >
                <div
                  className="h-full rounded-full bg-accent-amber"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <div
              className={`text-center font-mono text-[10px] font-semibold ${done
                  ? 'text-accent-green'
                  : active
                    ? 'text-accent-amber'
                    : 'text-text-muted'
                }`}
            >
              {done
                ? (dict?.streaks?.completed || '')
                : progressText}
            </div>
          </Link>
        );
      })}
    </div>
  );
};