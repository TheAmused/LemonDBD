'use client';
// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { ChallengeModeModal, buildCompletionTiles } from '../ChallengeModeModal';
import { ChaosRulesModal } from './ChaosRulesModal';
import { CHAOS_DIFFICULTY_ORDER } from '@/utils/challengeTierCompletion';
import { TierEasyIcon, TierMediumIcon, TierHellIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from "@/context/DictionaryContext";

export interface ChaosModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  currentDifficulty?: Difficulty;
  /** False when switching difficulty mid-run from the board header -- skips
   *  the explanatory intro, since the player already knows how Chaos works. */
  showIntro?: boolean;
  /** Difficulties this user has ever fully completed, mapped to the killer
   *  count frozen at that completion -- clearing a harder one marks every
   *  easier tile as done too, inheriting its count. */
  completedCounts?: Record<string, number>;
  /** Difficulties ever completed with the entire game roster -- same shape
   *  and cascade, upgrades the badge to red. */
  completedFullCounts?: Record<string, number>;
}

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({
      isOpen,
      onClose,
      onSelectDifficulty,
      currentDifficulty,
      showIntro = true,
      completedCounts = {},
      completedFullCounts = {},
    }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const tiles = buildCompletionTiles(
    CHAOS_DIFFICULTY_ORDER,
    [
      {
        value: 'easy',
        label: s.chaosEasyLabel,
        description: s.chaosEasyDesc,
        icon: TierEasyIcon,
        image: '/images/streaks/modes/chaos-easy.webp',
      },
      {
        value: 'medium',
        label: s.chaosMediumLabel,
        description: s.chaosMediumDesc,
        icon: TierMediumIcon,
        image: '/images/streaks/modes/chaos-medium.webp',
      },
      {
        value: 'hell',
        label: s.chaosHellLabel,
        description: s.chaosHellDesc,
        icon: TierHellIcon,
        image: '/images/streaks/modes/chaos-hell.webp',
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
          ? s.chaosIntro
          : undefined
      }
      tiles={tiles}
      onSelectTile={(value) => onSelectDifficulty(value as Difficulty)}
      tileGridClassName="sm:grid-cols-3"
      selectedValue={currentDifficulty}
      renderRules={(rules) => <ChaosRulesModal {...rules} />}
    />
  );
};
