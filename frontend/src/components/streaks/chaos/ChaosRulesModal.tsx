'use client';
// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx

import React from 'react';
import { RulesModalShell } from '../RulesModalShell';
import {
  DIFFICULTY_BADGE,
  RulesDifficultyRows,
  RulesSection,
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
} from '../RulesModalSections';
import { useDictionary } from "@/context/DictionaryContext";

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose }) => {
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
          s.chaosWinCondition,
          s.chaosNoRepeatRule,
          s.chaosAddonRule,
          s.chaosCheckpointRule,
          s.chaosCompletionRule,
        ]}
      />

      <RulesSection title={s.difficultyAndCheckpoints}>
        <RulesDifficultyRows
          rows={[
            {
              label: s.chaosEasyLabel,
              text: s.chaosEasyDesc,
              badgeClassName: DIFFICULTY_BADGE.green,
            },
            {
              label: s.chaosMediumLabel,
              text: s.chaosMediumDesc,
              badgeClassName: DIFFICULTY_BADGE.amber,
            },
            {
              label: s.chaosHellLabel,
              text: s.chaosHellDesc,
              badgeClassName: DIFFICULTY_BADGE.red,
            },
          ]}
        />
      </RulesSection>

      <RulesModalFooterSections
        copy={s}
        tone="red"
        exceptions={resolveRuleEntries(s, STANDARD_EXCEPTIONS)}
        clarifications={resolveRuleEntries(s, STANDARD_CLARIFICATIONS)}
      />
    </RulesModalShell>
  );
};
