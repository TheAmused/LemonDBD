'use client';
// frontend/src/components/streaks/history/HistoryRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { RulesModalShell } from '../RulesModalShell';
import {
  DIFFICULTY_BADGE,
  RulesConceptCard,
  RulesDifficultyRows,
  RulesFlameSection,
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  resolveRuleEntries,
  streakCopy,
} from '../RulesModalSections';

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose, dict }) => {
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
        tone="neutral"
        title={s.historyConceptLabel || 'Concept'}
        text={
          s.historyConceptShort ||
          'Killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next.'
        }
      />

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

      <RulesFlameSection title={s.difficultyAndCheckpoints || 'Difficulty'}>
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
      </RulesFlameSection>

      <RulesModalFooterSections
        copy={s}
        tone="neutral"
        exceptions={resolveRuleEntries(s, STANDARD_EXCEPTIONS)}
        clarifications={resolveRuleEntries(s, STANDARD_CLARIFICATIONS_WITH_ADDONS)}
      />
    </RulesModalShell>
  );
};
