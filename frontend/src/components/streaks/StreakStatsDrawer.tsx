'use client';
// frontend/src/components/streaks/StreakStatsDrawer.tsx

import React, { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { StreakAttemptGroups, groupByAttempt, type StreakMatchLogBase } from './StreakAttemptGroups';
import { useDictionary } from "@/context/DictionaryContext";
import { Surface } from '@/components/common/Surface';

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
  /** Secondary line under the label, e.g. "Streak: 4" or "Attempt 2, Page 3". Return null for no line. A loss does not show the streak. */
  renderMeta: (log: TLog) => React.ReactNode;
  /** Extra text after "Attempt N" in an attempt's header, e.g. the killer when one drawer covers several runs. */
  renderGroupLabel?: (log: TLog) => React.ReactNode;
}

const STAT_CELL_TONES = {
  neutral: 'text-text-primary',
  green: 'text-accent-green',
  red: 'text-accent-red',
} as const;

/** One count in the stats row: small label over a large value, centred. */
const StatCell: React.FC<{ label: string; value: number; tone?: keyof typeof STAT_CELL_TONES }> = ({ label, value, tone = 'neutral' }) => (
  <Surface tone="elevated" radius="control" padding="none" className={`px-2 py-2.5 text-center shadow-sm ${STAT_CELL_TONES[tone]}`}>
    <div className="type-label-xs truncate opacity-80">{label}</div>
    <div className="mt-0.5 text-2xl font-black tabular-nums">{value}</div>
  </Surface>
);

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
  const winShare = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const lossShare = totalMatches > 0 ? (losses / totalMatches) * 100 : 0;
  const recentLogs = stats ? stats.recent_logs || [] : [];
  const groups = groupByAttempt(recentLogs);
  const recentGroups = groups.slice(0, VISIBLE_ATTEMPTS);
  const olderGroups = groups.slice(VISIBLE_ATTEMPTS);
  const listProps = { renderLabel, renderMeta, renderGroupLabel };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        variant="drawer-right"
        title={dict.streaks.stats}
        closeButtonAriaLabel={dict.modal.close}
        bodyClassName="space-y-6 p-5 sm:p-6"
      >
        <div className="space-y-2">
          <Surface tone="elevated" padding="none" className="p-4 shadow-inner">
            <span className="type-label-sm text-text-secondary">{dict.streaks.winRate}</span>
            <div className="mt-1 text-5xl font-extrabold tabular-nums text-text-primary">
              {winRate.toFixed(1)}
              <span className="ml-0.5 text-2xl text-text-secondary">{dict.streaks.percentSign}</span>
            </div>
            {/* The split of wins and losses; the counts themselves are in the tiles below. */}
            <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-border-color" aria-hidden="true">
              <div className="bg-accent-green" style={{ width: `${winShare}%` }} />
              <div className="bg-accent-red" style={{ width: `${lossShare}%` }} />
            </div>
          </Surface>

          <div className={`grid gap-2 ${attempts !== undefined ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <StatCell label={dict.streaks.matches} value={totalMatches} />
            {attempts !== undefined && <StatCell label={dict.streaks.attempts} value={attempts} />}
            <StatCell label={dict.streaks.wins} value={wins} tone="green" />
            <StatCell label={dict.streaks.losses} value={losses} tone="red" />
          </div>
        </div>

        <div>
          <h3 className="type-label text-text-secondary mb-4">
            {dict.streaks.matchHistory}
          </h3>

          {recentLogs.length === 0 ? (
            <Surface tone="elevated" padding="none" className="text-center py-8 text-text-muted text-xs">
              {dict.streaks.noMatchesLogged}
            </Surface>
          ) : (
            <>
              <p className="mb-3 text-xs text-text-muted">{dict.streaks.matchHistoryLimitNote}</p>
              <StreakAttemptGroups groups={recentGroups} openByDefault={groups[0].key} {...listProps} />
              {olderGroups.length > 0 && (
                <Button variant="secondary" size="md" className="mt-3 w-full" onClick={() => setIsOlderOpen(true)}>
                  {dict.streaks.olderAttempts} ({olderGroups.length})
                </Button>
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
        closeButtonAriaLabel={dict.modal.close}
        bodyClassName="p-5"
      >
        <StreakAttemptGroups groups={olderGroups} {...listProps} />
      </Modal>
    </>
  );
}
