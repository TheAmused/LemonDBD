'use client';
// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx
import type { Dictionary } from '@/locales/types';

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
  streakCopy,
} from '../RulesModalSections';
import { useDictionary } from "@/context/DictionaryContext";

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose }) => {
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
          s.chaosWinCondition || 'Win = 3 kills or more.',
          s.chaosNoRepeatRule || "Perks don't repeat until the whole pool has been drawn.",
          s.chaosAddonRule || 'Add-ons must match the 2 drawn rarities.',
          s.chaosCheckpointRule ||
            'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.',
          s.chaosCompletionRule || 'Clear the pool with every killer to complete the run.',
        ]}
      />

      <RulesSection title={s.difficultyAndCheckpoints || 'Difficulty'}>
        <RulesDifficultyRows
          rows={[
            {
              label: s.chaosEasyLabel || 'Easy',
              text: s.chaosEasyDesc || 'A checkpoint every 5 wins.',
              badgeClassName: DIFFICULTY_BADGE.green,
            },
            {
              label: s.chaosMediumLabel || 'Medium',
              text: s.chaosMediumDesc || 'A checkpoint every 10 wins.',
              badgeClassName: DIFFICULTY_BADGE.amber,
            },
            {
              label: s.chaosHellLabel || 'Hell',
              text: s.chaosHellDesc || 'No checkpoints.',
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
