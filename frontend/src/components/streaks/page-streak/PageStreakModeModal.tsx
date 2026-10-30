// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';


import React from 'react';
import { type ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { ChallengeModeModal } from '../ChallengeModeModal';
import { PageStreakRulesModal } from './PageStreakRulesModal';
import { useDictionary } from "@/context/DictionaryContext";

export interface PageStreakModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

export const PageStreakModeModal: React.FC<PageStreakModeModalProps> = ({ isOpen, onClose, onStart }) => {
  const dict = useDictionary();
  const tiles: ChallengeIntroTile[] = [
    {
      value: 'normal',
      label: dict.streaks.normal,
      image: '/images/streaks/page-streak.webp',
    },
  ];

  return (
    <ChallengeModeModal
      isOpen={isOpen}
      onClose={onClose}
      intro={
        dict.streaks.pageStreakIntro
      }
      tiles={tiles}
      onSelectTile={() => onStart()}
      tileGridClassName="grid-cols-1 max-w-xs mx-auto"
      renderRules={(rules) => <PageStreakRulesModal {...rules} />}
    />
  );
};
