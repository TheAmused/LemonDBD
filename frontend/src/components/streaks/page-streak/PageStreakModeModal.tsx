// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { NEUTRAL_TILE_ACCENT, type ChallengeIntroTile } from '../ChallengeIntroModalShell';
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
        dict.streaks.pageStreakIntro
      }
      tiles={tiles}
      onSelectTile={() => onStart()}
      tileGridClassName="sm:grid-cols-1 max-w-xs mx-auto"
      renderRules={(rules) => <PageStreakRulesModal {...rules} />}
    />
  );
};
