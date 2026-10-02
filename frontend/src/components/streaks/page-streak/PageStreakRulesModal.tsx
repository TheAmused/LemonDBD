'use client';
// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { RulesModalShell } from '../RulesModalShell';
import {
  RulesConceptCard,
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
  streakCopy,
} from '../RulesModalSections';

export interface PageStreakRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const PageStreakRulesModal: React.FC<PageStreakRulesModalProps> = ({ isOpen, onClose, dict }) => {
  const s = streakCopy(dict);
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={BookOpen}
      title={s.rules || 'Rules'}
      dict={dict}
    >
      <RulesConceptCard
        tone="red"
        title={s.pageStreakConceptLabel || 'Concept'}
        text={s.pageStreakConceptShort || 'Pick a killer, then build a loadout from your perks, split across pages.'}
      />

      <RulesHowItWorks
        tone="red"
        title={s.howItWorks || 'How it works'}
        items={[
          s.pageStreakKillWinCondition || 'Win = 3 kills or more.',
          s.pageStreakWinCondition || 'Win a page to move to the next.',
          s.pageStreakLossCondition || 'Lose and start over from page 1.',
        ]}
      />

      <RulesModalFooterSections
        copy={s}
        tone="red"
        exceptions={resolveRuleEntries(s, STANDARD_EXCEPTIONS)}
        clarifications={resolveRuleEntries(s, STANDARD_CLARIFICATIONS_WITH_ADDONS)}
      />
    </RulesModalShell>
  );
};
