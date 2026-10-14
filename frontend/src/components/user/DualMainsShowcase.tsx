// frontend/src/components/user/DualMainsShowcase.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MainCard } from './MainCard';
import { ShowcaseCharacterModal } from './ShowcaseCharacterModal';
import { ShowcasePerkModal } from './ShowcasePerkModal';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import type { UserShowcaseState } from '@/types/userShowcase';
import type { RoleCategory } from '@/types/perks';
import { isSurvivor } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";

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
    <div className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors">
      {/* Connected Header with Collapsible Drawer Toggle */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="relative w-full flex items-center justify-between py-4 px-5 sm:py-4.5 sm:px-7 2xl:py-5.5 2xl:px-9 cursor-pointer group select-none overflow-hidden transition-colors text-left"
        aria-expanded={isExpanded}
      >
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30 mix-blend-luminosity filter pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
          style={{ backgroundImage: "url('/images/banners/banner_loadouts.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div className="relative z-10 w-8 hidden sm:block" aria-hidden="true" />
        <div className="relative z-10 flex-1 text-center">
          <h2 className="type-section-title text-text-primary group-hover:text-accent-red transition-colors">
            {dict.user.dualMainsTitle}
          </h2>
        </div>
        <div className="relative z-10 w-8 flex justify-end">
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-red transition-transform duration-300 ease-in-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      {/* Connected Dual Mains Grid Drawer */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-5 border-t border-border-color">
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
          </div>
        </div>
      </div>

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
    </div>
  );
};
