// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { PageStreakRulesModal } from './PageStreakRulesModal';

export interface PageStreakModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  dict?: Dictionary;
}

export const PageStreakModeModal: React.FC<PageStreakModeModalProps> = ({ isOpen, onClose, onStart, dict }) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'normal',
      label: dict?.streaks?.normal || 'Normal',
      description: dict?.streaks?.pageStreakNormalDesc || 'Every perk page counts.',
      icon: BookOpen,
      accentClassName: 'border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red',
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={BookOpen}
        iconClassName="bg-accent-red/10 border-accent-red/20 text-accent-red"
        title={dict?.streaks?.pageStreak || 'Page streak'}
        intro={
          dict?.streaks?.pageStreakIntro ||
          'Pick a killer and build the strongest loadout you can from their current perk page. Win to move to the next page, lose and start over from page 1.'
        }
        rulesLabel={dict?.streaks?.rules || 'Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={tiles}
        onSelectTile={() => onStart()}
        tileGridClassName="sm:grid-cols-1 max-w-xs mx-auto"
        escapeDisabled={isRulesOpen}
        currentLabel={dict?.streaks?.current || 'Current'}
        dict={dict}
      />

      <PageStreakRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
