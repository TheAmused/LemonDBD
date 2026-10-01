'use client';
// frontend/src/components/streaks/history/HistoryModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { ChallengeModeModal, buildCompletionTiles } from '../ChallengeModeModal';
import { HistoryRulesModal } from './HistoryRulesModal';
import { HISTORY_MODE_ORDER } from '@/utils/challengeTierCompletion';
import { TierMediumIcon, TierHellIcon } from '@/components/icons/DbdIcons';

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
  const s = dict?.streaks;
  const tiles = buildCompletionTiles(
    HISTORY_MODE_ORDER,
    [
      {
        value: 'medium',
        label: s?.historyMediumLabel || 'Medium',
        description: s?.historyMediumDesc || 'A checkpoint for every row you clear.',
        icon: TierMediumIcon,
        image: '/images/streaks/modes/history-default.webp',
      },
      {
        value: 'hell',
        label: s?.historyHellLabel || 'Hell',
        description: s?.historyHellDesc || 'No checkpoints. One loss resets everything.',
        icon: TierHellIcon,
        image: '/images/streaks/modes/history-hell.webp',
      },
    ],
    completedCounts,
    completedFullCounts
  );

  return (
    <ChallengeModeModal
      isOpen={isOpen}
      onClose={onClose}
      intro={
        showIntro
          ? s?.historyIntro ||
            'Your owned killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next one and add its teachable perks to your pool.'
          : undefined
      }
      tiles={tiles}
      onSelectTile={(value) => onSelectMode(value as HistoryMode)}
      tileGridClassName="sm:grid-cols-2"
      selectedValue={currentMode}
      renderRules={(rules) => <HistoryRulesModal {...rules} dict={dict} />}
      dict={dict}
    />
  );
};
