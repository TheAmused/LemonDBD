// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
'use client';

import React, { useState } from 'react';
import { Coins, Flame, Skull } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { ChaosRulesModal } from './ChaosRulesModal';

export interface ChaosModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  currentDifficulty?: Difficulty;
  dict?: any;
}

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({
  isOpen,
  onClose,
  onSelectDifficulty,
  currentDifficulty,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'easy',
      label: dict?.streaks?.chaosEasyLabel || 'Easy',
      description: dict?.streaks?.chaosEasyDesc || 'A checkpoint banks every 5 wins.',
      icon: Coins,
      accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400',
    },
    {
      value: 'medium',
      label: dict?.streaks?.chaosMediumLabel || 'Medium',
      description: dict?.streaks?.chaosMediumDesc || 'A checkpoint banks every 10 wins.',
      icon: Flame,
      accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400',
    },
    {
      value: 'hell',
      label: dict?.streaks?.chaosHellLabel || 'Hell',
      description: dict?.streaks?.chaosHellDesc || 'No checkpoints. One loss resets everything.',
      icon: Skull,
      accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400',
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Flame}
        iconClassName="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
        title={dict?.streaks?.chooseDifficulty || 'Choose a difficulty'}
        intro={
          dict?.streaks?.chaosIntro ||
          'Pull the lever to draw 4 random perks and 2 addon rarities from your unlocked pool, then pick which owned killer plays the round. Win 3 kills or more to keep your streak alive.'
        }
        rulesLabel={dict?.streaks?.rules || 'Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={tiles}
        onSelectTile={(value) => onSelectDifficulty(value as Difficulty)}
        tileGridClassName="sm:grid-cols-3"
        escapeDisabled={isRulesOpen}
        selectedValue={currentDifficulty}
        currentLabel={dict?.streaks?.current || 'Current'}
      />

      <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
