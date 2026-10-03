'use client';
// frontend/src/components/streaks/history/HistoryModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { ChallengeModeModal, buildCompletionTiles } from '../ChallengeModeModal';
import { HistoryRulesModal } from './HistoryRulesModal';
import { HISTORY_MODE_ORDER } from '@/utils/challengeTierCompletion';
import { TierMediumIcon, TierHellIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from "@/context/DictionaryContext";

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
}

export const HistoryModeModal: React.FC<HistoryModeModalProps> = ({
      isOpen,
      onClose,
      onSelectMode,
      currentMode,
      showIntro = true,
      completedCounts = {},
      completedFullCounts = {},
    }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const tiles = buildCompletionTiles(
    HISTORY_MODE_ORDER,
    [
      {
        value: 'medium',
        label: s.historyMediumLabel,
        description: s.historyMediumDesc,
        icon: TierMediumIcon,
        image: '/images/streaks/modes/history-default.webp',
      },
      {
        value: 'hell',
        label: s.historyHellLabel,
        description: s.historyHellDesc,
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
          ? s.historyIntro
          : undefined
      }
      tiles={tiles}
      onSelectTile={(value) => onSelectMode(value as HistoryMode)}
      tileGridClassName="sm:grid-cols-2"
      selectedValue={currentMode}
      renderRules={(rules) => <HistoryRulesModal {...rules} />}
    />
  );
};
