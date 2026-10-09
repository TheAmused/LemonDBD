'use client';
// frontend/src/components/streaks/StreakStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { Percent } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { StreakAttemptGroups, groupByAttempt, type StreakMatchLogBase } from './StreakAttemptGroups';
import { useDictionary } from "@/context/DictionaryContext";

/** Attempts listed in the drawer itself; older ones open in a dialog. */
const VISIBLE_ATTEMPTS = 10;

export type { StreakMatchLogBase };

export interface StreakStatsBase<TLog extends StreakMatchLogBase> {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: TLog[];
}

export interface StreakStatsDrawerProps<TLog extends StreakMatchLogBase> {
  isOpen: boolean;
  onClose: () => void;
  stats: StreakStatsBase<TLog> | null;
  /** The number of the attempt in progress, counting the first one. Comes from the live run, not from `stats`. */
  attempts?: number;
  /** The main label for a match row: character/killer name, or the "Auto-loss" badge is handled for you. */
  renderLabel: (log: TLog) => React.ReactNode;
  /** Secondary line under the label, e.g. "Streak: 4" or "Attempt 2, Page 3". */
  renderMeta: (log: TLog) => React.ReactNode;
  /** Extra text after "Attempt N" in an attempt's header, e.g. the killer when one drawer covers several runs. */
  renderGroupLabel?: (log: TLog) => React.ReactNode;
}

/**
 * Shared "Recent Match History" drawer for every streak mode. Gauntlet,
 * Chaos, History, and Page Streak each used to hand-roll this same layout
 * (win-rate card, matches/wins/losses cards, recent-match list with an
 * inactivity badge) with small visual drift between copies. Only the
 * per-mode label/meta for each row differs now, via render props.
 */
export function StreakStatsDrawer<TLog extends StreakMatchLogBase>({ isOpen, onClose, stats, attempts, renderLabel, renderMeta, renderGroupLabel }: StreakStatsDrawerProps<TLog>) {
  const dict = useDictionary();
  const [isOlderOpen, setIsOlderOpen] = useState(false);

  const winRate = stats ? stats.win_rate : 0;
  const totalMatches = stats ? stats.total_matches : 0;
  const wins = stats ? stats.wins : 0;
  const losses = stats ? stats.losses : 0;
  const recentLogs = stats ? stats.recent_logs || [] : [];
  const groups = groupByAttempt(recentLogs);
  const recentGroups = groups.slice(0, VISIBLE_ATTEMPTS);
  const olderGroups = groups.slice(VISIBLE_ATTEMPTS);
  // Old matches are pruned, so the totals can count more than the list still holds.
  const hasPrunedMatches = totalMatches > recentLogs.length;
  const listProps = { renderLabel, renderMeta, renderGroupLabel };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        variant="drawer-right"
        title={dict.streaks.stats}
        centerTitle
        closeButtonAriaLabel={dict.modal.close}
        bodyClassName="space-y-6 p-5 sm:p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-bg-elevated border border-border-color rounded-xl p-5 flex items-center justify-between shadow-inner">
            <div>
              <span className="type-label-sm text-text-secondary">
                {dict.streaks.winRate}
              </span>
              <div className="text-4xl font-extrabold text-text-primary mt-1">
                {winRate.toFixed(1)}{dict.streaks.percentSign}
              </div>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-bg-elevated border-4 border-accent-red font-bold text-lg shadow-sm">
              <Percent className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
            <div className="type-label-sm text-text-secondary">
              {dict.streaks.matches}
            </div>
            <div className="text-2xl font-black text-text-primary mt-1">{totalMatches}</div>
          </div>

          {attempts !== undefined && (
            <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
              <div className="type-label-sm text-text-secondary">
                {dict.streaks.attempts}
              </div>
              <div className="text-2xl font-black text-text-primary mt-1">{attempts}</div>
            </div>
          )}

          <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
            <div className="type-label-sm text-accent-green">
              {dict.streaks.wins}
            </div>
            <div className="text-2xl font-black text-accent-green mt-1">{wins}</div>
          </div>

          <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
            <div className="type-label-sm text-accent-red">
              {dict.streaks.losses}
            </div>
            <div className="text-2xl font-black text-accent-red mt-1">{losses}</div>
          </div>
        </div>

        <div>
          <h3 className="type-label text-text-secondary mb-4">
            {dict.streaks.recentMatchHistory}
          </h3>

          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-xs bg-bg-elevated rounded-xl border border-border-color">
              {dict.streaks.noMatchesLogged}
            </div>
          ) : (
            <>
              <StreakAttemptGroups groups={recentGroups} openByDefault={groups[0].key} {...listProps} />
              {olderGroups.length > 0 && (
                <Button variant="secondary" size="md" className="mt-3 w-full" onClick={() => setIsOlderOpen(true)}>
                  {dict.streaks.olderAttempts} ({olderGroups.length})
                </Button>
              )}
              {hasPrunedMatches && (
                <p className="mt-3 text-center text-xs text-text-muted">{dict.streaks.olderMatchesNotStored}</p>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isOlderOpen}
        onClose={() => setIsOlderOpen(false)}
        variant="dialog"
        size="2xl"
        title={dict.streaks.olderAttempts}
        centerTitle
        closeButtonAriaLabel={dict.modal.close}
        bodyClassName="p-5"
      >
        <StreakAttemptGroups groups={olderGroups} {...listProps} />
      </Modal>
    </>
  );
}
