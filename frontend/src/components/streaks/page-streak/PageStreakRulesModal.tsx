'use client';
// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx

import React from 'react';
import { RulesModalShell } from '../RulesModalShell';
import {
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
} from '../RulesModalSections';
import { useDictionary } from "@/context/DictionaryContext";

export interface PageStreakRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PageStreakRulesModal: React.FC<PageStreakRulesModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s.rules}
    >
      <RulesHowItWorks
        tone="red"
        title={s.howItWorks}
        items={[
          s.pageStreakKillWinCondition,
          s.pageStreakWinCondition,
          s.pageStreakLossCondition,
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
