// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { PageStreakRulesModal } from './PageStreakRulesModal';

export interface PageStreakModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  dict?: any;
}

const TILES: ChallengeIntroTile[] = [
  {
    value: 'normal',
    label: 'Normal',
    description: 'Every perk page counts. No difficulty options yet.',
    icon: BookOpen,
    accentClassName: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10',
  },
];

export const PageStreakModeModal: React.FC<PageStreakModeModalProps> = ({ isOpen, onClose, onStart, dict }) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={BookOpen}
        iconClassName="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
        title={dict?.streaks?.pageStreak || 'Page streak'}
        intro="Pick a killer and build the strongest loadout you can from their current perk page. Win to move to the next page, lose and start over from page 1."
        rulesLabel={dict?.streaks?.rules || 'Page Streak Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={TILES}
        onSelectTile={() => onStart()}
        tileGridClassName="sm:grid-cols-1 max-w-xs mx-auto sm:mx-0"
      />

      <PageStreakRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
