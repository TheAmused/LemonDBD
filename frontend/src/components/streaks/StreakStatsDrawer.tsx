'use client';
// frontend/src/components/streaks/StreakStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { X, Percent } from 'lucide-react';
import { StreakMatchRow } from './StreakMatchRow';
import { StreakMatchesModal } from './StreakMatchesModal';

const VISIBLE_MATCHES = 10;

export interface StreakMatchLogBase {
  id: number;
  result: 'win' | 'loss';
  triggered_by: 'player' | 'inactivity';
  timestamp?: string;
}

export interface StreakStatsBase<TLog extends StreakMatchLogBase> {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: TLog[];
}

/** The streak value worth showing for a match: the new streak on a win, the streak that was lost on a defeat. */
export function streakAtResult(log: { result: 'win' | 'loss'; streak_before: number; streak_after: number }): number {
  return log.result === 'win' ? log.streak_after : log.streak_before;
}

export type StreakAccent = 'amber' | 'violet' | 'slate' | 'orange';

const FLAT_ACCENT = {
  icon: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  ring: 'border-accent-red',
};

const ACCENT_CLASSES: Record<StreakAccent, { icon: string; ring: string }> = {
  amber: FLAT_ACCENT,
  violet: FLAT_ACCENT,
  slate: FLAT_ACCENT,
  orange: FLAT_ACCENT,
};

export interface StreakStatsDrawerProps<TLog extends StreakMatchLogBase> {
  isOpen: boolean;
  onClose: () => void;
  accent: StreakAccent;
  stats: StreakStatsBase<TLog> | null;
  /** Losses since the current run's pool was last (re)frozen -- from the live run, not the match-log aggregate, so it survives independently of `stats`. */
  attempts?: number;
  /** The main label for a match row: character/killer name, or the "Auto-loss" badge is handled for you. */
  renderLabel: (log: TLog) => React.ReactNode;
  /** Secondary line under the label, e.g. "Streak: 4" or "Attempt 2, Page 3". */
  renderMeta: (log: TLog) => React.ReactNode;
  dict?: Dictionary;
}

/**
 * Shared "Recent Match History" drawer for every streak mode. Gauntlet,
 * Chaos, History, and Page Streak each used to hand-roll this same layout
 * (win-rate card, matches/wins/losses cards, recent-match list with an
 * inactivity badge) with small visual drift between copies. Only the
 * per-mode label/meta for each row differs now, via render props.
 */
export function StreakStatsDrawer<TLog extends StreakMatchLogBase>({
  isOpen,
  onClose,
  accent,
  stats,
  attempts,
  renderLabel,
  renderMeta,
  dict,
}: StreakStatsDrawerProps<TLog>) {
  const [isAllOpen, setIsAllOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || isAllOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAllOpen, onClose]);

  if (!isOpen) return null;

  const accentClasses = ACCENT_CLASSES[accent];
  const winRate = stats ? stats.win_rate : 0;
  const totalMatches = stats ? stats.total_matches : 0;
  const wins = stats ? stats.wins : 0;
  const losses = stats ? stats.losses : 0;
  const recentLogs = stats ? stats.recent_logs || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-primary/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-bg-surface border-l border-border-color h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border-color bg-bg-elevated">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-text-primary">{dict?.streaks?.stats || 'Statistics'}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-bg-elevated border border-border-color rounded-xl p-5 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-xs uppercase font-bold text-text-secondary tracking-wider">
                  {dict?.streaks?.winRate || 'Win Rate'}
                </span>
                <div className="text-4xl font-extrabold text-text-primary mt-1">
                  {winRate.toFixed(1)}{dict?.streaks?.percentSign || '%'}
                </div>
              </div>
              <div className={`relative w-16 h-16 flex items-center justify-center rounded-full bg-bg-elevated border-4 ${accentClasses.ring} font-bold text-lg shadow-sm`}>
                <Percent className="w-8 h-8 opacity-80" />
              </div>
            </div>

            <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
              <div className="text-xs uppercase font-bold text-text-secondary">
                {dict?.streaks?.matches || 'Matches'}
              </div>
              <div className="text-2xl font-black text-text-primary mt-1">{totalMatches}</div>
            </div>

            {attempts !== undefined && (
              <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
                <div className="text-xs uppercase font-bold text-text-secondary">
                  {dict?.streaks?.attempts || 'Attempts'}
                </div>
                <div className="text-2xl font-black text-text-primary mt-1">{attempts}</div>
              </div>
            )}

            <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
              <div className="text-xs uppercase font-bold text-accent-green">
                {dict?.streaks?.wins || 'Wins'}
              </div>
              <div className="text-2xl font-black text-accent-green mt-1">{wins}</div>
            </div>

            <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
              <div className="text-xs uppercase font-bold text-accent-red">
                {dict?.streaks?.losses || 'Losses'}
              </div>
              <div className="text-2xl font-black text-accent-red mt-1">{losses}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
              {dict?.streaks?.recentMatchHistory || 'Recent Match History'}
            </h3>

            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs bg-bg-elevated rounded-xl border border-border-color">
                {dict?.streaks?.noMatchesLogged || 'No matches logged yet. Complete your first match!'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.slice(0, VISIBLE_MATCHES).map((log) => (
                  <StreakMatchRow key={log.id} log={log} renderLabel={renderLabel} renderMeta={renderMeta} dict={dict} />
                ))}
                {recentLogs.length > VISIBLE_MATCHES && (
                  <button
                    type="button"
                    onClick={() => setIsAllOpen(true)}
                    className="w-full rounded-xl border border-border-color bg-bg-surface py-2.5 text-sm font-bold text-text-primary transition-colors hover:bg-bg-elevated cursor-pointer"
                  >
                    {dict?.streaks?.viewAllWins || 'View all'} ({recentLogs.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <StreakMatchesModal
        isOpen={isAllOpen}
        onClose={() => setIsAllOpen(false)}
        logs={recentLogs}
        renderLabel={renderLabel}
        renderMeta={renderMeta}
        dict={dict}
      />
    </div>
  );
}
