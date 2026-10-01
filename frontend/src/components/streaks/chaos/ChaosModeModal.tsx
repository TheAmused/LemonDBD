'use client';
// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Difficulty } from '@/types/chaosStreak';
import { ChallengeModeModal, buildCompletionTiles } from '../ChallengeModeModal';
import { ChaosRulesModal } from './ChaosRulesModal';
import { CHAOS_DIFFICULTY_ORDER } from '@/utils/challengeTierCompletion';
import { TierEasyIcon, TierMediumIcon, TierHellIcon } from '@/components/icons/DbdIcons';

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
  dict?: Dictionary;
}

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({
  isOpen,
  onClose,
  onSelectDifficulty,
  currentDifficulty,
  showIntro = true,
  completedCounts = {},
  completedFullCounts = {},
  dict,
}) => {
  const s = dict?.streaks;
  const tiles = buildCompletionTiles(
    CHAOS_DIFFICULTY_ORDER,
    [
      {
        value: 'easy',
        label: s?.chaosEasyLabel || 'Easy',
        description: s?.chaosEasyDesc || 'A checkpoint every 5 wins.',
        icon: TierEasyIcon,
        image: '/images/streaks/modes/chaos-easy.webp',
      },
      {
        value: 'medium',
        label: s?.chaosMediumLabel || 'Medium',
        description: s?.chaosMediumDesc || 'A checkpoint every 10 wins.',
        icon: TierMediumIcon,
        image: '/images/streaks/modes/chaos-medium.webp',
      },
      {
        value: 'hell',
        label: s?.chaosHellLabel || 'Hell',
        description: s?.chaosHellDesc || 'No checkpoints. One loss resets everything.',
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
          ? s?.chaosIntro ||
            'Pull the lever to draw 4 random perks and 2 addon rarities from your unlocked pool, then pick which owned killer plays the round. Win 3 kills or more to keep your streak alive.'
          : undefined
      }
      tiles={tiles}
      onSelectTile={(value) => onSelectDifficulty(value as Difficulty)}
      tileGridClassName="sm:grid-cols-3"
      selectedValue={currentDifficulty}
      renderRules={(rules) => <ChaosRulesModal {...rules} dict={dict} />}
      dict={dict}
    />
  );
};
