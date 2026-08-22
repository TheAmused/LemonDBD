// frontend/src/components/streaks/chaos/ChaosStatsDrawer.tsx
'use client';

import React, { useEffect } from 'react';
import { ChaosStats } from '@/types/chaosStreak';
import { X, BarChart2, CheckCircle2, XCircle, Trophy, Flame, Percent, Activity, Clock } from 'lucide-react';
import { ADDON_RARITY_ICONS } from '@/constants/addonRarityIcons';

export interface ChaosStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ChaosStats | null;
}

export const ChaosStatsDrawer: React.FC<ChaosStatsDrawerProps> = ({ isOpen, onClose, stats }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const winRate = stats ? stats.win_rate : 0;
  const totalMatches = stats ? stats.total_matches : 0;
  const wins = stats ? stats.wins : 0;
  const losses = stats ? stats.losses : 0;
  const recentLogs = stats ? stats.recent_logs || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chaos Streak Statistics</h2>
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
              <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 border-4 border-violet-500 text-violet-500 font-bold text-lg shadow-sm">
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
              <Trophy className="w-4 h-4 text-violet-500 dark:text-violet-400" />
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
                          {log.triggered_by === 'inactivity' ? (
                            <div className="flex items-center gap-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              Auto-loss, run was inactive
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{log.killer_id}</div>
                              <div className="flex items-center gap-1 mt-1">
                                {log.addon_rarities.map((rarity, i) => (
                                  <img
                                    key={i}
                                    src={ADDON_RARITY_ICONS[rarity]}
                                    alt={rarity}
                                    title={rarity}
                                    className="h-3.5 w-3.5 rounded object-cover border border-black/10 dark:border-white/10"
                                  />
                                ))}
                              </div>
                            </>
                          )}
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
