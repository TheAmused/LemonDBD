'use client';
// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { ChaosRulesModal } from './ChaosRulesModal';
import { cascadeCompletedTiers, tierCompletionCount, CHAOS_DIFFICULTY_ORDER } from '@/utils/challengeTierCompletion';
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
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const completedTiers = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, Object.keys(completedCounts));
  const completedFullTiers = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, Object.keys(completedFullCounts));

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'easy',
      label: dict?.streaks?.chaosEasyLabel || 'Easy',
      description: dict?.streaks?.chaosEasyDesc || 'A checkpoint every 5 wins.',
      icon: TierEasyIcon,
      accentClassName: 'border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red',
      completed: completedTiers.has('easy'),
      completedCount: tierCompletionCount(CHAOS_DIFFICULTY_ORDER, completedCounts, 'easy'),
      completedFull: completedFullTiers.has('easy'),
      completedFullCount: tierCompletionCount(CHAOS_DIFFICULTY_ORDER, completedFullCounts, 'easy'),
    },
    {
      value: 'medium',
      label: dict?.streaks?.chaosMediumLabel || 'Medium',
      description: dict?.streaks?.chaosMediumDesc || 'A checkpoint every 10 wins.',
      icon: TierMediumIcon,
      accentClassName: 'border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red',
      completed: completedTiers.has('medium'),
      completedCount: tierCompletionCount(CHAOS_DIFFICULTY_ORDER, completedCounts, 'medium'),
      completedFull: completedFullTiers.has('medium'),
      completedFullCount: tierCompletionCount(CHAOS_DIFFICULTY_ORDER, completedFullCounts, 'medium'),
    },
    {
      value: 'hell',
      label: dict?.streaks?.chaosHellLabel || 'Hell',
      description: dict?.streaks?.chaosHellDesc || 'No checkpoints. One loss resets everything.',
      icon: TierHellIcon,
      accentClassName: 'border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red',
      completed: completedTiers.has('hell'),
      completedCount: tierCompletionCount(CHAOS_DIFFICULTY_ORDER, completedCounts, 'hell'),
      completedFull: completedFullTiers.has('hell'),
      completedFullCount: tierCompletionCount(CHAOS_DIFFICULTY_ORDER, completedFullCounts, 'hell'),
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Flame}
        iconClassName="bg-accent-red/10 border-accent-red/20 text-accent-red"
        title={dict?.streaks?.chooseDifficulty || 'Choose a difficulty'}
        intro={
          showIntro
            ? dict?.streaks?.chaosIntro ||
              'Pull the lever to draw 4 random perks and 2 addon rarities from your unlocked pool, then pick which owned killer plays the round. Win 3 kills or more to keep your streak alive.'
            : undefined
        }
        rulesLabel={showIntro ? dict?.streaks?.rules || 'Rules' : undefined}
        onOpenRules={showIntro ? () => setIsRulesOpen(true) : undefined}
        tiles={tiles}
        onSelectTile={(value) => onSelectDifficulty(value as Difficulty)}
        tileGridClassName="sm:grid-cols-3"
        escapeDisabled={isRulesOpen}
        selectedValue={currentDifficulty}
        currentLabel={dict?.streaks?.current || 'Current'}
        dict={dict}
      />

      <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
