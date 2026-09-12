'use client';
// frontend/src/components/streaks/ChallengeCompletionHistoryDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { X, History, RotateCcw, Users, Swords } from 'lucide-react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import type { StreakAccent } from './StreakStatsDrawer';

const ACCENT_ICON_CLASSES: Record<StreakAccent, string> = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
};

export interface ChallengeCompletionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  accent: StreakAccent;
  completions: ChallengeCompletion[];
  dict?: Dictionary;
}

/**
 * Shared "Past Wins" drawer for gauntlet/chaos/history: every time a run is
 * fully completed, a permanent snapshot survives the run's own reset (which
 * wipes its match logs). Lets a player compare attempts taken across past
 * clears to see whether they're actually getting better.
 */
export const ChallengeCompletionHistoryDrawer: React.FC<ChallengeCompletionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  title,
  accent,
  completions,
  dict,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${ACCENT_ICON_CLASSES[accent]}`}>
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {title} {dict?.streaks?.pastWins || 'Past Wins'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {completions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-xs bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
              {dict?.streaks?.noCompletionsLogged || 'No completed runs yet. Finish the whole challenge to see it here!'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {completions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Swords className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {entry.matches_played} {dict?.streaks?.matches || 'Matches'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {entry.attempts_taken} {dict?.streaks?.attempts || 'Attempts'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {entry.unlocked_characters_count} {dict?.streaks?.unlockedAtCompletion || 'unlocked'}
                    </div>
                  </div>
                  {entry.completed_at && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(entry.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
