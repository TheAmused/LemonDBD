'use client';
// frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import type { RosterEntry } from '@/types/pageStreak';
import { staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { PersonIcon } from '@/components/icons/DbdIcons';
import { DisabledBadge } from '@/components/DisabledBadge';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';
import { useDictionary } from "@/context/DictionaryContext";

interface KillerRosterGridProps {
  locale: string;
  roster: RosterEntry[];
}

const CARD_CLASSES = 'relative flex h-full flex-col overflow-hidden rounded-control border pb-3 transition-all';

const KillerPortrait: React.FC<{ name: string; src?: string; done: boolean; disabled: boolean }> = ({
  name,
  src,
  done,
  disabled,
}) => {
  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden bg-bg-elevated">
      <PerkIcon
        src={src}
        alt={name}
        imageClassName={`h-full w-full object-cover ${disabled ? 'grayscale opacity-60' : ''}`}
        fallbackIcon={
          <PersonIcon
            className={`h-7 w-7 ${done ? 'text-accent-green/80' : 'text-text-muted'}`}
            aria-hidden="true"
          />
        }
      />
    </div>
  );
};

export const KillerRosterGrid: React.FC<KillerRosterGridProps> = ({ locale, roster }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  const [disabledEntry, setDisabledEntry] = useState<RosterEntry | null>(null);
  return (
    <>
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-10">
      {roster.map((entry) => {
        // ever_completed comes from the persistent completion history, so it
        // survives a per-killer abandon (which flips status back to in_progress).
        // status === 'completed' stays as a fallback for older data.
        const done = entry.ever_completed || entry.status === 'completed';
        // An admin kill-switch keeps the killer on the roster, marked, but it cannot be opened.
        const playable = entry.owned && !entry.disabled;
        const active = entry.status === 'in_progress' && playable;
        const displayName = characterDisplayName(entry.killer);
        const cleared = entry.status === 'not_started' ? 0 : Math.max(0, entry.current_page - 1);
        const pct = entry.page_count > 0 ? Math.round((cleared / entry.page_count) * 100) : 0;

        const showProgress = !done && playable;
        const showStatus = playable || entry.disabled;
        const progressText =
          `${cleared} ${dict.streaks.ofLabel} ${entry.page_count} ${dict.streaks.pagesCount}`.trim();

        const card = (
          <>
              {done && (
                <span
                  className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent-green text-text-inverted shadow-sm"
                  aria-label={dict.streaks.completed}
                >
                  <Check className="icon-xs" strokeWidth={3} aria-hidden="true" />
                </span>
              )}
              {entry.disabled && (
                <DisabledBadge
                  label={displayName}
                  onClick={() => setDisabledEntry(entry)}
                  position="left-1.5 top-1.5"
                />
              )}
              <KillerPortrait
                name={displayName}
                src={staticUrl(entry.avatar_local_path)}
                done={done}
                disabled={entry.disabled}
              />
              <div className="mt-2 px-3 text-center type-strong text-text-secondary truncate">
                {displayName}
              </div>
              {/* The bar and status line always take their room, so locked, completed and
                  unfinished cards share one height. Unused ones are only hidden. */}
              <div
                className={`mx-3 mt-2 h-1 overflow-hidden rounded-full bg-bg-elevated ${showProgress ? '' : 'invisible'}`}
                // Decorative: the pages cleared are in the text below it.
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-accent-amber"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div
                className={`mt-2 px-3 text-center text-tiny font-semibold ${showStatus ? '' : 'invisible'} ${entry.disabled || active
                    ? 'text-accent-amber'
                    : done
                      ? 'text-accent-green'
                      : 'text-text-muted'
                  }`}
                aria-hidden={showStatus ? undefined : true}
              >
                {entry.disabled
                  ? dict.streaks.disabled
                  : done
                    ? dict.streaks.completed
                    : progressText}
              </div>
          </>
        );

        return (
          <li key={entry.killer}>
            {playable ? (
              <Link
                href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
                className={`${CARD_CLASSES} shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-red ${done
                    ? 'border-accent-green/40 bg-accent-green/[0.07] hover:border-accent-green/60 ps-complete-pulse'
                    : active
                      ? 'border-accent-amber/45 bg-accent-amber/[0.07] hover:border-accent-amber/70'
                      : 'border-border-color bg-bg-surface hover:border-border-color hover:bg-bg-elevated'
                  }`}
              >
                {card}
              </Link>
            ) : entry.disabled ? (
              // Switched off by an admin: marked, with the reason one tap away on the badge.
              <div className={`${CARD_CLASSES} border-accent-amber/40 bg-bg-surface`}>
                {card}
              </div>
            ) : (
              // A killer the player does not have: shown greyed out, with nothing to open.
              <div aria-disabled="true" className={`${CARD_CLASSES} cursor-not-allowed border-border-color bg-bg-surface opacity-40 grayscale`}>
                {card}
              </div>
            )}
          </li>
        );
      })}
    </ul>
    <DisabledReasonModal
      isOpen={disabledEntry !== null}
      onClose={() => setDisabledEntry(null)}
      label={disabledEntry ? characterDisplayName(disabledEntry.killer) : ''}
      reason={disabledEntry?.disabled_reason}
    />
    </>
  );
};
