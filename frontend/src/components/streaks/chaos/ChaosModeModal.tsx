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
  dict?: any;
}

const TILES: ChallengeIntroTile[] = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'A checkpoint banks every 5 wins.',
    icon: Coins,
    accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'A checkpoint banks every 10 wins.',
    icon: Flame,
    accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
  {
    value: 'hell',
    label: 'Hell',
    description: 'No checkpoints. One loss resets everything.',
    icon: Skull,
    accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
];

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({ isOpen, onClose, onSelectDifficulty, dict }) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Flame}
        iconClassName="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
        title={dict?.streaks?.chooseDifficulty || 'Choose a difficulty'}
        intro="Pull the lever to draw 4 random perks and 2 addon rarities from your unlocked pool, then pick which owned killer plays the round. Win 3 kills or more to keep your streak alive."
        rulesLabel={dict?.streaks?.rules || 'Chaos Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={TILES}
        onSelectTile={(value) => onSelectDifficulty(value as Difficulty)}
        tileGridClassName="sm:grid-cols-3"
      />

      <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
