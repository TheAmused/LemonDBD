'use client';
// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { RulesModalShell } from '../RulesModalShell';
import {
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
  streakCopy,
} from '../RulesModalSections';
import { useDictionary } from "@/context/DictionaryContext";

export interface PageStreakRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PageStreakRulesModal: React.FC<PageStreakRulesModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();
  const s = streakCopy(dict);
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s.rules || 'Rules'}
    >
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
