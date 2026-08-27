// frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx
'use client';

import React, { useState } from 'react';
import { Swords, Lock } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { GauntletRulesModal } from './GauntletRulesModal';

export interface GauntletModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOriginal: () => void;
  role: 'killer' | 'survivor';
  dict?: any;
}

export const GauntletModeModal: React.FC<GauntletModeModalProps> = ({
  isOpen,
  onClose,
  onSelectOriginal,
  role,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'original',
      label: dict?.streaks?.original || 'Original',
      description: 'Classic, original Gauntlet rules. A checkpoint banks every 10 wins.',
      icon: Swords,
      accentClassName: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    },
    {
      value: 'lemon',
      label: dict?.streaks?.lemonVersion || 'Lemon version',
      description: 'A lightly modified, easier take on the Gauntlet.',
      icon: Lock,
      accentClassName: 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30',
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
        iconClassName="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
        title={dict?.streaks?.chooseGauntletMode || 'Choose a Gauntlet Mode'}
        intro={`Face a random owned ${role} with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.`}
        rulesLabel={dict?.streaks?.rules || 'Gauntlet Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={tiles}
        onSelectTile={(value) => {
          if (value === 'original') onSelectOriginal();
        }}
        tileGridClassName="sm:grid-cols-2"
      />

      <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} dict={dict} />
    </>
  );
};
