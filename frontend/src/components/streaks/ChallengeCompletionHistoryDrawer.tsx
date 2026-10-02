'use client';
// frontend/src/components/streaks/ChallengeCompletionHistoryDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { X, RotateCcw, Users, Swords } from 'lucide-react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export interface ChallengeCompletionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  completions: ChallengeCompletion[];
  /** Translated plural noun for `unlocked_characters_count`, e.g. "killers" or "survivors".
   *  Omit to hide that stat entirely -- not every mode tracks it meaningfully (Page Streak
   *  is scoped to one killer per completion, so an "owned" count doesn't apply). */
  subjectLabel?: string;
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
  completions,
  subjectLabel,
  dict,
}) => {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-primary/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-bg-surface border-l border-border-color h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border-color bg-bg-elevated">
          <h2 className="text-xl font-bold text-text-primary">
            {dict?.streaks?.pastWins || 'Win History'}
          </h2>
          <button
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {completions.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-xs bg-bg-elevated rounded-xl border border-border-color">
              {dict?.streaks?.noCompletionsLogged || 'No completed runs yet. Finish the whole challenge to see it here!'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {completions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-bg-elevated border border-border-color shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
                      <Swords className="w-3.5 h-3.5 text-text-muted" />
                      {entry.matches_played} {dict?.streaks?.matches || 'Matches'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
                      <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                      {entry.attempts_taken} {dict?.streaks?.attempts || 'Attempts'}
                    </div>
                    {subjectLabel && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
                        <Users className="w-3.5 h-3.5 text-text-muted" />
                        {entry.unlocked_characters_count} {subjectLabel}
                      </div>
                    )}
                  </div>
                  {entry.completed_at && (
                    <div className="text-[11px] text-text-secondary font-mono">
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
