// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile, NEUTRAL_TILE_ACCENT } from '../ChallengeIntroModalShell';
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
      icon: BookOpen,
      image: '/images/streaks/page-streak.webp',
      accentClassName: NEUTRAL_TILE_ACCENT,
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={dict?.streaks?.chooseMode || 'Choose a mode'}
        intro={
          dict?.streaks?.pageStreakIntro ||
          'Pick a killer and build the strongest loadout you can from their current perk page. After a win you move to the next page, after a loss you start over.'
        }
        rulesLabel={dict?.streaks?.readFullRules || 'Read full rules'}
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
