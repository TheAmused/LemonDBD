// frontend/src/components/user/DualMainsShowcase.tsx
'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(true);

  // Modal state for characters
  const [characterModalRole, setCharacterModalRole] = useState<RoleCategory | null>(null);

  // Modal state for perks
  const [perkModalConfig, setPerkModalConfig] = useState<{
    role: RoleCategory;
    slotIndex: number;
    currentPerkId: number | null;
  } | null>(null);

  return (
    <div className="rounded-3xl border border-border-color bg-bg-surface p-6 sm:p-8 backdrop-blur-xl shadow-md space-y-6">
      {/* Connected Header with Collapsible Drawer Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-color">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-text-primary font-mono flex items-center gap-2">
              <span>{dict?.user?.dualMainsTitle || 'Signature Loadouts'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border-color bg-bg-elevated text-text-muted">
                {dict?.user?.dualMainsSubtitle || 'Survivor & Killer'}
              </span>
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 font-mono">
              {showcase.survivorMain.characterName} • {showcase.killerMain.characterName}
            </p>
          </div>
        </div>

        {/* Collapsible toggle button */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-color bg-bg-elevated hover:border-accent-amber/50 text-xs font-bold font-mono text-text-primary hover:text-accent-amber transition-all cursor-pointer shadow-xs"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? (dict?.user?.hideLoadouts || 'Hide Loadouts') : (dict?.user?.showLoadouts || 'Show Loadouts')}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-accent-amber" />
          ) : (
            <ChevronDown className="h-4 w-4 text-accent-amber" />
          )}
        </button>
      </div>

      {/* Connected Dual Mains Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
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
      )}

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
