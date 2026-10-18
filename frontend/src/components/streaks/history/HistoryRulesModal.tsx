'use client';
// frontend/src/components/streaks/history/HistoryRulesModal.tsx

import React from 'react';
import { RulesModalShell } from '../RulesModalShell';
import {
  DIFFICULTY_BADGE,
  RulesDifficultyRows,
  RulesSection,
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
} from '../RulesModalSections';
import { useDictionary } from "@/context/DictionaryContext";

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s.rules}
    >
      <RulesHowItWorks
        tone="neutral"
        title={s.howItWorks}
        items={[
          s.historyWinCondition,
          s.historyStartingPerksNote,
          s.historyPerkUnlockRule,
          s.historyCheckpointRule,
        ]}
        hint={s.historyConceptHint}
      />

      <RulesSection title={s.difficultyAndCheckpoints}>
        <RulesDifficultyRows
          alignTextRight
          rows={[
            {
              label: s.mediumMode,
              text: s.mediumModeDesc,
              badgeClassName: DIFFICULTY_BADGE.amber,
            },
            {
              label: s.hellMode,
              text: s.hellModeDesc,
              badgeClassName: DIFFICULTY_BADGE.red,
            },
          ]}
        />
      </RulesSection>

      <RulesModalFooterSections
        copy={s}
        tone="neutral"
        exceptions={resolveRuleEntries(s, STANDARD_EXCEPTIONS)}
        clarifications={resolveRuleEntries(s, STANDARD_CLARIFICATIONS_WITH_ADDONS)}
      />
    </RulesModalShell>
  );
};
