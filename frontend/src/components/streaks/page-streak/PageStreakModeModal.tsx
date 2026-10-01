// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { NEUTRAL_TILE_ACCENT, type ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { ChallengeModeModal } from '../ChallengeModeModal';
import { PageStreakRulesModal } from './PageStreakRulesModal';

export interface PageStreakModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  dict?: Dictionary;
}

export const PageStreakModeModal: React.FC<PageStreakModeModalProps> = ({ isOpen, onClose, onStart, dict }) => {
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
    <ChallengeModeModal
      isOpen={isOpen}
      onClose={onClose}
      intro={
        dict?.streaks?.pageStreakIntro ||
        'Pick a killer and build the strongest loadout you can from their current perk page. After a win you move to the next page, after a loss you start over.'
      }
      tiles={tiles}
      onSelectTile={() => onStart()}
      tileGridClassName="sm:grid-cols-1 max-w-xs mx-auto"
      renderRules={(rules) => <PageStreakRulesModal {...rules} dict={dict} />}
      dict={dict}
    />
  );
};
