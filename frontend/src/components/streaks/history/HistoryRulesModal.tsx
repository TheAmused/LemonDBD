'use client';
// frontend/src/components/streaks/history/HistoryRulesModal.tsx
import type { Dictionary } from '@/locales/types';

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
  streakCopy,
} from '../RulesModalSections';
import { useDictionary } from "@/context/DictionaryContext";

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();
  const s = streakCopy(dict);
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s.rules || 'Rules'}
    >
      <RulesHowItWorks
        tone="neutral"
        title={s.howItWorks || 'How it works'}
        items={[
          s.historyWinCondition || 'Win = 3 kills or more. Anything less breaks the streak.',
          s.historyStartingPerksNote || 'You start with every General perk unlocked.',
          s.historyPerkUnlockRule || 'Beating a killer adds their teachables to your pool.',
          s.historyCheckpointRule ||
            'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.',
        ]}
        hint={s.historyConceptHint || 'For the full experience try to play killers in order from the oldest to newest. 🙂'}
      />

      <RulesSection title={s.difficultyAndCheckpoints || 'Difficulty'}>
        <RulesDifficultyRows
          alignTextRight
          rows={[
            {
              label: s.mediumMode || 'Medium',
              text: s.mediumModeDesc || 'Checkpoint every row.',
              badgeClassName: DIFFICULTY_BADGE.amber,
            },
            {
              label: s.hellMode || 'Hell',
              text: s.hellModeDesc || 'No checkpoints.',
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
