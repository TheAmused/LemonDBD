'use client';
// frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import type { RosterEntry } from '@/types/pageStreak';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { KillerIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from "@/context/DictionaryContext";

interface KillerRosterGridProps {
  locale: string;
  roster: RosterEntry[];
}

const KillerPortrait: React.FC<{ name: string; src?: string; done: boolean }> = ({
  name,
  src,
  done,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden bg-bg-elevated">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          draggable={false}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <KillerIcon
          className={`h-7 w-7 ${done ? 'text-accent-green/80' : 'text-text-muted'}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export const KillerRosterGrid: React.FC<KillerRosterGridProps> = ({ locale, roster }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-10" role="list">
      {roster.map((entry) => {
        // ever_completed comes from the persistent completion history, so it
        // survives a per-killer abandon (which flips status back to in_progress).
        // status === 'completed' stays as a fallback for older data.
        const done = entry.ever_completed || entry.status === 'completed';
        const active = entry.status === 'in_progress';
        const displayName = characterDisplayName(entry.killer);
        const cleared = entry.status === 'not_started' ? 0 : Math.max(0, entry.current_page - 1);
        const pct = entry.page_count > 0 ? Math.round((cleared / entry.page_count) * 100) : 0;

        const progressAriaLabel = dict.streaks.progress
          ? `${displayName} - ${dict.streaks.progress} ${pct}%`
          : `${displayName} ${pct}%`;

        const progressText =
          `${cleared} ${dict.streaks.ofLabel} ${entry.page_count} ${dict.streaks.pagesCount}`.trim();

        return (
          <Link
            key={entry.killer}
            href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
            className={`relative flex flex-col overflow-hidden rounded-xl border pb-3 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-red ${done
                ? 'border-accent-green/40 bg-accent-green/[0.07] hover:border-accent-green/60 ps-complete-pulse'
                : active
                  ? 'border-accent-amber/45 bg-accent-amber/[0.07] hover:border-accent-amber/70'
                  : 'border-border-color bg-bg-surface hover:border-border-color hover:bg-bg-elevated'
              }`}
          >
            {done && (
              <span
                className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent-green text-text-inverted shadow-sm"
                aria-label={dict.streaks.completed}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            <KillerPortrait
              name={displayName}
              src={staticUrl(entry.avatar_local_path)}
              done={done}
            />
            <div className="mt-2 px-3 text-center type-strong text-text-secondary truncate">
              {displayName}
            </div>
            {!done && (
              <div
                className="mx-3 mt-2 h-1 overflow-hidden rounded-full bg-bg-elevated"
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
              className={`mt-2 px-3 text-center text-tiny font-semibold ${done
                  ? 'text-accent-green'
                  : active
                    ? 'text-accent-amber'
                    : 'text-text-muted'
                }`}
            >
              {done
                ? (dict.streaks.completed)
                : progressText}
            </div>
          </Link>
        );
      })}
    </div>
  );
};
