'use client';
// frontend/src/components/streaks/ChallengeCompletionHistoryDrawer.tsx

import React from 'react';
import { RotateCcw, Users, Swords } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { formatDate } from '@/utils/format';
import { useLocale, useDictionary } from '@/context/DictionaryContext';
import { Surface } from '@/components/common/Surface';

export interface ChallengeCompletionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  completions: ChallengeCompletion[];
  /** Translated plural noun for `unlocked_characters_count`, e.g. "killers" or "survivors".
   *  Omit to hide that stat entirely -- not every mode tracks it meaningfully (Page Streak
   *  is scoped to one killer per completion, so an "owned" count doesn't apply). */
  subjectLabel?: string;
}

/**
 * Shared "Past Wins" drawer for gauntlet/chaos/history: every time a run is
 * fully completed, a permanent snapshot survives the run's own abandon (which
 * wipes its match logs). Lets a player compare attempts taken across past
 * clears to see whether they're actually getting better.
 */
export const ChallengeCompletionHistoryDrawer: React.FC<ChallengeCompletionHistoryDrawerProps> = ({ isOpen, onClose, completions, subjectLabel }) => {
  const dict = useDictionary();
  const locale = useLocale();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer-right"
      title={dict.streaks.pastWins}
      closeButtonAriaLabel={dict.modal.close}
      bodyClassName="p-5 sm:p-6"
    >
      {completions.length === 0 ? (
        <Surface tone="elevated" padding="none" className="text-center py-8 text-text-muted text-xs">
          {dict.streaks.noCompletionsLogged}
        </Surface>
      ) : (
        <div className="space-y-2.5">
          {completions.map((entry) => (
            <Surface
              key={entry.id}
              tone="elevated" padding="none" className="flex items-center justify-between p-3.5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 type-strong text-text-secondary">
                  <Swords className="w-3.5 h-3.5 text-text-muted" />
                  {entry.matches_played} {dict.streaks.matches}
                </div>
                <div className="flex items-center gap-1.5 type-strong text-text-secondary">
                  <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                  {entry.attempts_taken} {dict.streaks.attempts}
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
                  {formatDate(entry.completed_at, locale)}
                </div>
              )}
            </Surface>
          ))}
        </div>
      )}
    </Modal>
  );
};
