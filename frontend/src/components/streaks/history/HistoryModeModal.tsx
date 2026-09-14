'use client';
// frontend/src/components/streaks/history/HistoryModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { Shield, Skull } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { HistoryRulesModal } from './HistoryRulesModal';
import { cascadeCompletedTiers, tierCompletionCount, HISTORY_MODE_ORDER } from '@/utils/challengeTierCompletion';

export interface HistoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: HistoryMode) => void;
  currentMode?: HistoryMode;
  /** False when switching mode mid-run from the board header -- skips the
   *  explanatory intro, since the player already knows how History works. */
  showIntro?: boolean;
  /** Modes this user has ever fully completed, mapped to the killer count
   *  frozen at that completion -- clearing Hell marks Medium done too,
   *  inheriting its count. */
  completedCounts?: Record<string, number>;
  /** Modes ever completed with the entire game roster -- same shape and
   *  cascade, upgrades the badge to red. */
  completedFullCounts?: Record<string, number>;
  dict?: Dictionary;
}

export const HistoryModeModal: React.FC<HistoryModeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  currentMode,
  showIntro = true,
  completedCounts = {},
  completedFullCounts = {},
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const completedTiers = cascadeCompletedTiers(HISTORY_MODE_ORDER, Object.keys(completedCounts));
  const completedFullTiers = cascadeCompletedTiers(HISTORY_MODE_ORDER, Object.keys(completedFullCounts));

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'medium',
      label: dict?.streaks?.historyMediumLabel || 'Medium',
      description: dict?.streaks?.historyMediumDesc || 'A checkpoint banks every row you clear.',
      icon: Shield,
      accentClassName: 'border-border-color bg-bg-elevated hover:bg-bg-elevated/80 text-text-secondary',
      completed: completedTiers.has('medium'),
      completedCount: tierCompletionCount(HISTORY_MODE_ORDER, completedCounts, 'medium'),
      completedFull: completedFullTiers.has('medium'),
      completedFullCount: tierCompletionCount(HISTORY_MODE_ORDER, completedFullCounts, 'medium'),
    },
    {
      value: 'hell',
      label: dict?.streaks?.historyHellLabel || 'Hell',
      description: dict?.streaks?.historyHellDesc || 'No checkpoints. One loss resets everything.',
      icon: Skull,
      accentClassName: 'border-border-color bg-bg-elevated hover:bg-bg-elevated/80 text-text-secondary',
      completed: completedTiers.has('hell'),
      completedCount: tierCompletionCount(HISTORY_MODE_ORDER, completedCounts, 'hell'),
      completedFull: completedFullTiers.has('hell'),
      completedFullCount: tierCompletionCount(HISTORY_MODE_ORDER, completedFullCounts, 'hell'),
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Shield}
        iconClassName="bg-bg-elevated border-border-color text-text-secondary"
        title={dict?.streaks?.chooseMode || 'Choose a mode'}
        intro={
          showIntro
            ? dict?.streaks?.historyIntro ||
              'Your owned killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next one and add its teachable perks to your pool.'
            : undefined
        }
        rulesLabel={showIntro ? dict?.streaks?.rules || 'Rules' : undefined}
        onOpenRules={showIntro ? () => setIsRulesOpen(true) : undefined}
        tiles={tiles}
        onSelectTile={(value) => onSelectMode(value as HistoryMode)}
        tileGridClassName="sm:grid-cols-2"
        escapeDisabled={isRulesOpen}
        selectedValue={currentMode}
        currentLabel={dict?.streaks?.current || 'Current'}
        dict={dict}
      />

      <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
