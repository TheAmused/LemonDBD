'use client';
// frontend/src/components/character-detail/components/CharacterPerksSection.tsx

import React, { useState } from 'react';
import { CharacterItem, PerkItem, getAssetUrl } from '../types';
import { Perk } from '@/types/perks';
import { DisabledBadge } from '@/components/DisabledBadge';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';
import { UnifiedHoverModal, ActiveHoverState } from './UnifiedHoverModal';

interface CharacterPerksSectionProps {
  perks: PerkItem[];
  character: CharacterItem;
  backendBase: string;
  onSelectPerk: (perk: Perk) => void;
  t: Record<string, string>;
}

export const CharacterPerksSection: React.FC<CharacterPerksSectionProps> = ({
  perks,
  character,
  backendBase,
  onSelectPerk,
  t,
}) => {
  const [activeHover, setActiveHover] = useState<ActiveHoverState | null>(null);
  const [disabledModalPerk, setDisabledModalPerk] = useState<PerkItem | null>(null);

  if (perks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 w-full">
      {perks.map((perk, idx) => {
        const iconSrc = getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url);

        return (
          <div
            key={`${perk.name}-${idx}`}
            className="relative"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isSurvivor = perk.category === 'Survivor';
              const localizedBadge = isSurvivor
                ? t.survivorPerk || 'Survivor Perk'
                : t.killerPerk || 'Killer Perk';
              setActiveHover({
                item: perk,
                rect,
                badge: localizedBadge,
                category: character.name || perk.character || localizedBadge,
                accentColor: 'text-amber-400',
              });
            }}
            onMouseLeave={() => setActiveHover(null)}
          >
            <button
              type="button"
              onClick={() =>
                onSelectPerk({
                  name: perk.name,
                  category: perk.category,
                  character: perk.character || character.name,
                  character_real_name: perk.character_real_name || character.real_name,
                  character_avatar_path: perk.character_avatar_path || character.avatar_local_path,
                  description: perk.description,
                  icon_url: perk.icon_url || '',
                  icon_local_path: perk.icon_local_path || '',
                })
              }
              className="h-24 w-24 sm:h-32 sm:w-32 flex items-center justify-center hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-2xl transition-all duration-300 cursor-pointer"
              aria-label={`${perk.name} - ${t.clickToInspect || 'Click to inspect perk'}`}
            >
              <img
                src={iconSrc}
                alt={perk.name}
                className={`h-full w-full object-contain filter drop-shadow-[0_0_14px_rgba(245,158,11,0.6)] ${
                  perk.is_disabled ? 'grayscale opacity-50' : ''
                }`}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </button>

            {perk.is_disabled && (
              <DisabledBadge label={perk.name} onClick={() => setDisabledModalPerk(perk)} />
            )}
          </div>
        );
      })}

      {/* Unified Hover Modal */}
      <UnifiedHoverModal
        activeHover={activeHover}
        placement="auto"
        t={t}
        isPerk={true}
        actionPrompt={t.clickToInspectPerk || t.clickToInspect || 'Click to inspect full perk values'}
      />

      <DisabledReasonModal
        isOpen={disabledModalPerk !== null}
        onClose={() => setDisabledModalPerk(null)}
        label={disabledModalPerk?.name || ''}
        reason={disabledModalPerk?.disabled_reason}
      />
    </div>
  );
};
