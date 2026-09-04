// frontend/src/components/user/DualMainsShowcase.tsx
'use client';

import React, { useState } from 'react';
import { MainCard } from './MainCard';
import { ShowcaseCharacterModal } from './ShowcaseCharacterModal';
import { ShowcasePerkModal } from './ShowcasePerkModal';
import type { UserShowcaseState } from '@/types/userShowcase';
import type { RoleCategory } from '@/types/perks';
import type { Dictionary } from '@/locales/types';

interface DualMainsShowcaseProps {
  showcase: UserShowcaseState;
  onSurvivorCharacterChange: (name: string) => void;
  onSurvivorPrestigeChange: (prestige: number) => void;
  onSurvivorPerkChange: (slotIndex: number, perkId: number | null) => void;
  onKillerCharacterChange: (name: string) => void;
  onKillerPrestigeChange: (prestige: number) => void;
  onKillerPerkChange: (slotIndex: number, perkId: number | null) => void;
  dict?: Dictionary | null;
  locale?: string;
}

export const DualMainsShowcase: React.FC<DualMainsShowcaseProps> = ({
  showcase,
  onSurvivorCharacterChange,
  onSurvivorPrestigeChange,
  onSurvivorPerkChange,
  onKillerCharacterChange,
  onKillerPrestigeChange,
  onKillerPerkChange,
  dict,
  locale = 'en',
}) => {
  // Modal state for characters
  const [characterModalRole, setCharacterModalRole] = useState<RoleCategory | null>(null);

  // Modal state for perks
  const [perkModalConfig, setPerkModalConfig] = useState<{
    role: RoleCategory;
    slotIndex: number;
    currentPerkId: number | null;
  } | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Survivor Main Column */}
        <MainCard
          role="Survivor"
          loadout={showcase.survivorMain}
          onCharacterChange={onSurvivorCharacterChange}
          onPrestigeChange={onSurvivorPrestigeChange}
          onPerkChange={onSurvivorPerkChange}
          onOpenCharacterModal={() => setCharacterModalRole('Survivor')}
          onOpenPerkModal={(slotIndex) =>
            setPerkModalConfig({
              role: 'Survivor',
              slotIndex,
              currentPerkId: showcase.survivorMain.perkIds[slotIndex],
            })
          }
          dict={dict}
          locale={locale}
        />

        {/* Killer Main Column */}
        <MainCard
          role="Killer"
          loadout={showcase.killerMain}
          onCharacterChange={onKillerCharacterChange}
          onPrestigeChange={onKillerPrestigeChange}
          onPerkChange={onKillerPerkChange}
          onOpenCharacterModal={() => setCharacterModalRole('Killer')}
          onOpenPerkModal={(slotIndex) =>
            setPerkModalConfig({
              role: 'Killer',
              slotIndex,
              currentPerkId: showcase.killerMain.perkIds[slotIndex],
            })
          }
          dict={dict}
          locale={locale}
        />
      </div>

      {/* Character Selector Modal */}
      {characterModalRole && (
        <ShowcaseCharacterModal
          isOpen={Boolean(characterModalRole)}
          role={characterModalRole}
          currentCharacter={
            characterModalRole === 'Survivor'
              ? showcase.survivorMain.characterName
              : showcase.killerMain.characterName
          }
          onSelect={(name) => {
            if (characterModalRole === 'Survivor') {
              onSurvivorCharacterChange(name);
            } else {
              onKillerCharacterChange(name);
            }
          }}
          onClose={() => setCharacterModalRole(null)}
          dict={dict}
          locale={locale}
        />
      )}

      {/* Perk Selector Modal */}
      {perkModalConfig && (
        <ShowcasePerkModal
          isOpen={Boolean(perkModalConfig)}
          role={perkModalConfig.role}
          slotIndex={perkModalConfig.slotIndex}
          currentPerkId={perkModalConfig.currentPerkId}
          onSelect={(perkId) => {
            if (perkModalConfig.role === 'Survivor') {
              onSurvivorPerkChange(perkModalConfig.slotIndex, perkId);
            } else {
              onKillerPerkChange(perkModalConfig.slotIndex, perkId);
            }
          }}
          onClear={() => {
            if (perkModalConfig.role === 'Survivor') {
              onSurvivorPerkChange(perkModalConfig.slotIndex, null);
            } else {
              onKillerPerkChange(perkModalConfig.slotIndex, null);
            }
          }}
          onClose={() => setPerkModalConfig(null)}
          dict={dict}
          locale={locale}
        />
      )}
    </div>
  );
};
