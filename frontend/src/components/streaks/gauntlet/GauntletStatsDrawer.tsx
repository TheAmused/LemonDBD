'use client';

import React, { useEffect } from 'react';
import { GauntletStats, MatchLog } from '@/types/gauntletStreak';
import { X, BarChart2, CheckCircle2, XCircle, Trophy, Flame, Percent, Activity } from 'lucide-react';

export interface GauntletStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GauntletStats | null;
}

export const GauntletStatsDrawer: React.FC<GauntletStatsDrawerProps> = ({ isOpen, onClose, stats }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const winRate = stats ? stats.win_rate : 0;
  const totalMatches = stats ? stats.total_matches : 0;
  const wins = stats ? stats.wins : 0;
  const losses = stats ? stats.losses : 0;
  const recentLogs: MatchLog[] = stats ? stats.recent_logs || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gauntlet Statistics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Match summary and historical performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Win Rate
                </span>
                <div className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {winRate.toFixed(1)}%
                </div>
              </div>
              <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 border-4 border-amber-500 text-amber-500 font-bold text-lg shadow-sm">
                <Percent className="w-8 h-8 opacity-80" />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                <Activity className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                Matches
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalMatches}</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div>
                <div className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Wins
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{wins}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 justify-end">
                  <XCircle className="w-3.5 h-3.5" /> Losses
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{losses}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Recent Match History
            </h3>

            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-xs bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                No matches logged yet. Complete your first match!
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.map((log) => {
                  const isWin = log.result === 'win';
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isWin
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isWin ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {log.character_id}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-xs font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                            isWin
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.result}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-end gap-1 font-mono">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>
                            Streak: {log.streak_before} &rarr; {log.streak_after}
                          </span>
                        </div>
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
};
