'use client';
// frontend/src/components/streaks/StreakStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { X, BarChart2, CheckCircle2, XCircle, Percent, Activity, Clock, RotateCcw } from 'lucide-react';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

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

export type StreakAccent = 'amber' | 'violet' | 'slate' | 'orange';

const FLAT_ACCENT = {
  icon: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  ring: 'border-accent-red',
  trophy: 'text-accent-red',
};

const ACCENT_CLASSES: Record<StreakAccent, { icon: string; ring: string; trophy: string }> = {
  amber: FLAT_ACCENT,
  violet: FLAT_ACCENT,
  slate: FLAT_ACCENT,
  orange: FLAT_ACCENT,
};

export interface StreakStatsDrawerProps<TLog extends StreakMatchLogBase> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  accent: StreakAccent;
  stats: StreakStatsBase<TLog> | null;
  /** Losses since the current run's pool was last (re)frozen -- from the live run, not the match-log aggregate, so it survives independently of `stats`. */
  attempts?: number;
  /** The main label for a match row: character/killer name, or the "Auto-loss" badge is handled for you. */
  renderLabel: (log: TLog) => React.ReactNode;
  /** Secondary line under the label, e.g. "Streak: 3 -> 4" or "Attempt 2, Page 3". */
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
  title,
  accent,
  stats,
  attempts,
  renderLabel,
  renderMeta,
  dict,
}: StreakStatsDrawerProps<TLog>) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
            <div className={`p-2.5 rounded-xl border ${accentClasses.icon}`}>
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{title} {dict?.streaks?.stats || 'Statistics'}</h2>
            </div>
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
              <div className="flex items-center gap-2 text-xs uppercase font-bold text-text-secondary">
                <Activity className="w-4 h-4 text-text-secondary" />
                {dict?.streaks?.matches || 'Matches'}
              </div>
              <div className="text-2xl font-black text-text-primary mt-1">{totalMatches}</div>
            </div>

            {attempts !== undefined && (
              <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs uppercase font-bold text-text-secondary">
                  <RotateCcw className="w-4 h-4 text-text-secondary" />
                  {dict?.streaks?.attempts || 'Attempts'}
                </div>
                <div className="text-2xl font-black text-text-primary mt-1">{attempts}</div>
              </div>
            )}

            <div className="col-span-2 bg-bg-elevated border border-border-color rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div>
                <div className="text-xs uppercase font-bold text-accent-green flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {dict?.streaks?.wins || 'Wins'}
                </div>
                <div className="text-xl font-black text-accent-green mt-1">{wins}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase font-bold text-accent-red flex items-center gap-1 justify-end">
                  <XCircle className="w-3.5 h-3.5" /> {dict?.streaks?.losses || 'Losses'}
                </div>
                <div className="text-xl font-black text-accent-red mt-1">{losses}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <AdeptBadgeIcon className={`w-4 h-4 ${accentClasses.trophy}`} />
              {dict?.streaks?.recentMatchHistory || 'Recent Match History'}
            </h3>

            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs bg-bg-elevated rounded-xl border border-border-color">
                {dict?.streaks?.noMatchesLogged || 'No matches logged yet. Complete your first match!'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.map((log) => {
                  const isWin = log.result === 'win';
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-bg-elevated border border-border-color hover:border-border-subtle transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isWin
                              ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                              : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                          }`}
                        >
                          {isWin ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          {log.triggered_by === 'inactivity' ? (
                            <div className="flex items-center gap-1 text-sm font-bold text-text-secondary">
                              <Clock className="w-3.5 h-3.5" />
                              {dict?.streaks?.autoLossInactive || 'Auto-loss, run was inactive'}
                            </div>
                          ) : (
                            renderLabel(log)
                          )}
                          <div className="text-[11px] text-text-secondary mt-1 font-mono">
                            {renderMeta(log)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-xs font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                            isWin
                              ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                              : 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                          }`}
                        >
                          {log.result}
                        </div>
                        {log.timestamp && (
                          <div className="text-[11px] text-text-secondary mt-1 font-mono">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
