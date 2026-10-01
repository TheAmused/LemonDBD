'use client';
// frontend/src/components/streaks/history/HistoryRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import {
  RulesModalConcept,
  RulesModalDifficultyList,
  RulesModalFooter,
  RulesModalHowItWorks,
  RulesModalShell,
} from '../RulesModalShell';

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose, dict }) => {
  const s = dict?.streaks;
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s?.rules || 'Rules'}
      dict={dict}
    >
      <RulesModalConcept title={s?.historyConceptLabel || 'Concept'}>
        {s?.historyConceptShort || 'Killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next.'}
      </RulesModalConcept>

      <RulesModalHowItWorks
        title={s?.howItWorks || 'How it works'}
        items={[
          s?.historyWinCondition || 'Win = 3 kills or more. Anything less breaks the streak.',
          s?.historyStartingPerksNote || 'You start with every General perk unlocked.',
          s?.historyPerkUnlockRule || 'Beating a killer adds their teachables to your pool.',
          s?.historyCheckpointRule || 'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.',
        ]}
        hint={s?.historyConceptHint || 'For the full experience try to play killers in order from the oldest to newest. 🙂'}
      />

      <RulesModalDifficultyList
        title={s?.difficultyAndCheckpoints || 'Difficulty'}
        rows={[
          {
            label: s?.mediumMode || 'Medium',
            text: s?.mediumModeDesc || 'Checkpoint every row.',
            badgeClassName: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
          },
          {
            label: s?.hellMode || 'Hell',
            text: s?.hellModeDesc || 'No checkpoints.',
            badgeClassName: 'bg-accent-red/20 text-accent-red border-accent-red/30',
          },
        ]}
      />

      <RulesModalFooter dict={dict} />
    </RulesModalShell>
  );
};
