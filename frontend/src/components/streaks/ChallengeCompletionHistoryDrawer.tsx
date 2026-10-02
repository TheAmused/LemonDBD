'use client';
// frontend/src/components/streaks/ChallengeCompletionHistoryDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { History, RotateCcw, Users, Swords } from 'lucide-react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { Modal } from '@/components/common/Modal';
import type { StreakAccent } from './StreakStatsDrawer';

export interface ChallengeCompletionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  accent: StreakAccent;
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
  title,
  completions,
  subjectLabel,
  dict,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer-right"
      icon={<History className="h-5 w-5" aria-hidden="true" />}
      title={`${title} ${dict?.streaks?.pastWins || 'Past Wins'}`}
      closeButtonAriaLabel={dict?.modal?.close || 'Close'}
      bodyClassName="p-5 sm:p-6"
    >
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
                <div className="flex items-center gap-1.5 type-strong text-text-secondary">
                  <Swords className="w-3.5 h-3.5 text-text-muted" />
                  {entry.matches_played} {dict?.streaks?.matches || 'Matches'}
                </div>
                <div className="flex items-center gap-1.5 type-strong text-text-secondary">
                  <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                  {entry.attempts_taken} {dict?.streaks?.attempts || 'Attempts'}
                </div>
                {subjectLabel && (
                  <div className="flex items-center gap-1.5 type-strong text-text-secondary">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    {entry.unlocked_characters_count} {subjectLabel}
                  </div>
                )}
              </div>
              {entry.completed_at && (
                <div className="type-caption text-text-secondary">
                  {new Date(entry.completed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
