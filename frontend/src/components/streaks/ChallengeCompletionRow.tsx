'use client';
// frontend/src/components/streaks/ChallengeCompletionRow.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { RotateCcw, Users, Swords } from 'lucide-react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';

export interface ChallengeCompletionRowProps {
  entry: ChallengeCompletion;
  /** Translated plural noun for `unlocked_characters_count`. Omit to hide that stat. */
  subjectLabel?: string;
  dict?: Dictionary;
}

/** One finished run in the win history, shared by the drawer and the "view all" modal. */
export const ChallengeCompletionRow: React.FC<ChallengeCompletionRowProps> = ({ entry, subjectLabel, dict }) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl bg-bg-elevated border border-border-color shadow-sm">
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
);
