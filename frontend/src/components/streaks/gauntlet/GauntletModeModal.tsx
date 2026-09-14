// frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx
'use client';
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { Swords, Lock } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { GauntletRulesModal } from './GauntletRulesModal';

export interface GauntletModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOriginal: () => void;
  role: 'killer' | 'survivor';
  currentMode?: 'original' | 'lemon';
  /** This role's Original Gauntlet has already been fully cleared. */
  originalCompleted?: boolean;
  /** Killer count frozen at that completion. */
  originalCompletedCount?: number | null;
  /** This role's Original Gauntlet was cleared with the entire game roster -- upgrades the badge to red. */
  originalCompletedFull?: boolean;
  /** Killer count frozen at that full-roster completion. */
  originalCompletedFullCount?: number | null;
  dict?: Dictionary;
}

export const GauntletModeModal: React.FC<GauntletModeModalProps> = ({
  isOpen,
  onClose,
  onSelectOriginal,
  role,
  currentMode,
  originalCompleted = false,
  originalCompletedCount = null,
  originalCompletedFull = false,
  originalCompletedFullCount = null,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'original',
      label: dict?.streaks?.original || 'Original',
      description:
        dict?.streaks?.gauntletOriginalDesc || 'Classic, original Gauntlet rules. A checkpoint banks every 10 wins.',
      icon: Swords,
      accentClassName: 'border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red',
      completed: originalCompleted,
      completedCount: originalCompletedCount,
      completedFull: originalCompletedFull,
      completedFullCount: originalCompletedFullCount,
    },
    {
      value: 'lemon',
      label: dict?.streaks?.lemonVersion || 'Lemon version',
      description: dict?.streaks?.gauntletLemonDesc || 'A lightly modified, easier take on the Gauntlet.',
      icon: Lock,
      accentClassName: 'border-border-color bg-bg-elevated/50',
      disabled: true,
      disabledBadge: dict?.streaks?.comingSoon || 'Coming soon.',
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Swords}
        iconClassName="bg-accent-red/10 border-accent-red/20 text-accent-red"
        title={dict?.streaks?.chooseGauntletMode || 'Choose a Gauntlet Mode'}
        intro={
          role === 'killer'
            ? dict?.streaks?.gauntletIntroKiller ||
              'Face a random owned killer with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.'
            : dict?.streaks?.gauntletIntroSurvivor ||
              'Face a random owned survivor with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.'
        }
        rulesLabel={dict?.streaks?.rules || 'Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={tiles}
        onSelectTile={(value) => {
          if (value === 'original') onSelectOriginal();
        }}
        tileGridClassName="sm:grid-cols-2"
        escapeDisabled={isRulesOpen}
        selectedValue={currentMode}
        currentLabel={dict?.streaks?.current || 'Current'}
        dict={dict}
      />

      <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} dict={dict} />
    </>
  );
};
