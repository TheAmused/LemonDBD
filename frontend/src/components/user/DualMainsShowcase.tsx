// frontend/src/components/user/DualMainsShowcase.tsx
'use client';

import React, { useState } from 'react';
import { MainCard } from './MainCard';
import { ShowcaseCharacterModal } from './ShowcaseCharacterModal';
import { ShowcasePerkModal } from './ShowcasePerkModal';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import type { UserShowcaseState } from '@/types/userShowcase';
import type { RoleCategory } from '@/types/perks';
import { isSurvivor } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";
import { AccordionSection } from '@/components/common/AccordionSection';

interface DualMainsShowcaseProps {
  showcase: UserShowcaseState;
  onSurvivorCharacterChange: (name: string, characterId?: number) => void;
  onSurvivorPrestigeChange: (prestige: number) => void;
  onSurvivorPerkChange: (slotIndex: number, perkId: number | null) => void;
  onKillerCharacterChange: (name: string, characterId?: number) => void;
  onKillerPrestigeChange: (prestige: number) => void;
  onKillerPerkChange: (slotIndex: number, perkId: number | null) => void;
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
      locale = 'en',
    }) => {
  const dict = useDictionary();
  const [isExpanded, toggleExpanded] = usePersistentDrawer('lemondbd_drawer_loadouts', true);

  // Modal state for characters
  const [characterModalRole, setCharacterModalRole] = useState<RoleCategory | null>(null);

  // Modal state for perks: one panel picks the whole build of a role
  const [perkModalRole, setPerkModalRole] = useState<RoleCategory | null>(null);

  return (
    <>
      <AccordionSection
        title={dict.user.dualMainsTitle}
        open={isExpanded}
        onToggle={toggleExpanded}
        banner="/images/banners/banner_loadouts.webp"
        bodyClassName="p-4 sm:p-5"
      >
          <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-border-color">
        {/* Survivor Main Column */}
        <MainCard
          role="Survivor"
          loadout={showcase.survivorMain}
          onCharacterChange={onSurvivorCharacterChange}
          onPrestigeChange={onSurvivorPrestigeChange}
          onPerkChange={onSurvivorPerkChange}
          onOpenCharacterModal={() => setCharacterModalRole('Survivor')}
          onOpenPerkModal={() => setPerkModalRole('Survivor')}
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
          onOpenPerkModal={() => setPerkModalRole('Killer')}
          locale={locale}
        />
          </div>
      </AccordionSection>
      {/* Character Selector Modal */}
            {characterModalRole && (
              <ShowcaseCharacterModal
                isOpen={Boolean(characterModalRole)}
                role={characterModalRole}
                currentCharacter={
                  isSurvivor(characterModalRole)
                    ? showcase.survivorMain.characterName
                    : showcase.killerMain.characterName
                }
                currentCharacterId={
                  isSurvivor(characterModalRole)
                    ? showcase.survivorMain.characterId
                    : showcase.killerMain.characterId
                }
                onSelect={(name, characterId) => {
                  if (isSurvivor(characterModalRole)) {
                    onSurvivorCharacterChange(name, characterId);
                  } else {
                    onKillerCharacterChange(name, characterId);
                  }
                }}
                onClose={() => setCharacterModalRole(null)}
                locale={locale}
              />
            )}

            {/* Perk Selector Modal */}
            {perkModalRole && (
              <ShowcasePerkModal
                isOpen={Boolean(perkModalRole)}
                role={perkModalRole}
                perkIds={isSurvivor(perkModalRole) ? showcase.survivorMain.perkIds : showcase.killerMain.perkIds}
                onSetPerk={isSurvivor(perkModalRole) ? onSurvivorPerkChange : onKillerPerkChange}
                onClose={() => setPerkModalRole(null)}
                locale={locale}
              />
            )}
    </>
  );
};
