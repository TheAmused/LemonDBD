'use client';
// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { RulesModalConcept, RulesModalFooter, RulesModalHowItWorks, RulesModalShell } from '../RulesModalShell';

interface PageStreakRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const PageStreakRulesModal: React.FC<PageStreakRulesModalProps> = ({ isOpen, onClose, dict }) => {
  const s = dict?.streaks;
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s?.rules || 'Rules'}
      dict={dict}
    >
      <RulesModalConcept title={s?.pageStreakConceptLabel || 'Concept'}>
        {s?.pageStreakConceptShort || 'Pick a killer, then build a loadout from your perks, split across pages.'}
      </RulesModalConcept>

      <RulesModalHowItWorks
        title={s?.howItWorks || 'How it works'}
        items={[
          s?.pageStreakKillWinCondition || 'Win = 3 kills or more.',
          s?.pageStreakWinCondition || 'Win a page to move to the next.',
          s?.pageStreakLossCondition || 'Lose and start over from page 1.',
        ]}
      />

      <RulesModalFooter dict={dict} />
    </RulesModalShell>
  );
};
