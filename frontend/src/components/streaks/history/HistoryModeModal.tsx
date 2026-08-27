// frontend/src/components/streaks/history/HistoryModeModal.tsx
'use client';

import React, { useState } from 'react';
import { Shield, Skull } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { HistoryRulesModal } from './HistoryRulesModal';

export interface HistoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: HistoryMode) => void;
  currentMode?: HistoryMode;
  dict?: any;
}

export const HistoryModeModal: React.FC<HistoryModeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  currentMode,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'medium',
      label: dict?.streaks?.historyMediumLabel || 'Medium',
      description: dict?.streaks?.historyMediumDesc || 'A checkpoint banks every row you clear.',
      icon: Shield,
      accentClassName: 'border-slate-400/30 bg-slate-500/5 hover:bg-slate-500/10 text-slate-500 dark:text-slate-400',
    },
    {
      value: 'hell',
      label: dict?.streaks?.historyHellLabel || 'Hell',
      description: dict?.streaks?.historyHellDesc || 'No checkpoints. One loss resets everything.',
      icon: Skull,
      accentClassName: 'border-slate-400/30 bg-slate-500/5 hover:bg-slate-500/10 text-slate-500 dark:text-slate-400',
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Shield}
        iconClassName="bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400"
        title={dict?.streaks?.chooseMode || 'Choose a mode'}
        intro={
          dict?.streaks?.historyIntro ||
          'Your owned killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next one and add its teachable perks to your pool.'
        }
        rulesLabel={dict?.streaks?.rules || 'Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={tiles}
        onSelectTile={(value) => onSelectMode(value as HistoryMode)}
        tileGridClassName="sm:grid-cols-2"
        escapeDisabled={isRulesOpen}
        selectedValue={currentMode}
        currentLabel={dict?.streaks?.current || 'Current'}
      />

      <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
