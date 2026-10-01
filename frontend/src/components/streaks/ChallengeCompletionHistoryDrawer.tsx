'use client';
// frontend/src/components/streaks/ChallengeCompletionHistoryDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { ChallengeAllWinsModal } from './ChallengeAllWinsModal';
import { ChallengeCompletionRow } from './ChallengeCompletionRow';

const VISIBLE_COMPLETIONS = 10;

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
              {completions.slice(0, VISIBLE_COMPLETIONS).map((entry) => (
                <ChallengeCompletionRow key={entry.id} entry={entry} subjectLabel={subjectLabel} dict={dict} />
              ))}
              {completions.length > VISIBLE_COMPLETIONS && (
                <button
                  type="button"
                  onClick={() => setIsAllOpen(true)}
                  className="w-full rounded-xl border border-border-color bg-bg-surface py-2.5 text-sm font-bold text-text-primary transition-colors hover:bg-bg-elevated cursor-pointer"
                >
                  {dict?.streaks?.viewAllWins || 'View all'} ({completions.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ChallengeAllWinsModal
        isOpen={isAllOpen}
        onClose={() => setIsAllOpen(false)}
        completions={completions}
        subjectLabel={subjectLabel}
        dict={dict}
      />
    </div>
  );
};
