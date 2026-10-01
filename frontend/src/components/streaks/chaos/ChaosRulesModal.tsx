'use client';
// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import {
  RulesModalConcept,
  RulesModalDifficultyList,
  RulesModalFooter,
  RulesModalHowItWorks,
  RulesModalShell,
} from '../RulesModalShell';

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose, dict }) => {
  const s = dict?.streaks;
  return (
    <RulesModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={s?.rules || 'Rules'}
      dict={dict}
    >
      <RulesModalConcept title={s?.chaosConcept || 'Concept'}>
        {s?.chaosConceptShort ||
          'Pull the lever for 4 random perks plus 2 add-on rarities. Pick a killer to run the build, then play the trial.'}
      </RulesModalConcept>

      <RulesModalHowItWorks
        title={s?.howItWorks || 'How it works'}
        items={[
          s?.chaosWinCondition || 'Win = 3 kills or more.',
          s?.chaosNoRepeatRule || "Perks don't repeat until the whole pool has been drawn.",
          s?.chaosAddonRule || 'Add-ons must match the 2 drawn rarities.',
          s?.chaosCheckpointRule || 'A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero.',
          s?.chaosCompletionRule || 'Clear the pool with every killer to complete the run.',
        ]}
      />

      <RulesModalDifficultyList
        title={s?.difficultyAndCheckpoints || 'Difficulty'}
        rows={[
          {
            label: s?.chaosEasyLabel || 'Easy',
            text: s?.chaosEasyDesc || 'A checkpoint every 5 wins.',
            badgeClassName: 'bg-accent-green/20 text-accent-green border-accent-green/30',
          },
          {
            label: s?.chaosMediumLabel || 'Medium',
            text: s?.chaosMediumDesc || 'A checkpoint every 10 wins.',
            badgeClassName: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
          },
          {
            label: s?.chaosHellLabel || 'Hell',
            text: s?.chaosHellDesc || 'No checkpoints.',
            badgeClassName: 'bg-accent-red/20 text-accent-red border-accent-red/30',
          },
        ]}
      />

      <RulesModalFooter dict={dict} addonsClarification={false} />
    </RulesModalShell>
  );
};
