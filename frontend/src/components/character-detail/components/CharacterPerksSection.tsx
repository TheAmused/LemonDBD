'use client';
// frontend/src/components/character-detail/components/CharacterPerksSection.tsx

import React, { useState } from 'react';
import { CharacterItem, PerkItem, getAssetUrl, CharacterDetailDictionary } from '../types';
import { Perk } from '@/types/perks';
import { DisabledBadge } from '@/components/DisabledBadge';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';
import { tip } from '@/components/common/Tooltip';
import { TileButton } from '@/components/common/TileButton';

interface CharacterPerksSectionProps {
  perks: PerkItem[];
  character: CharacterItem;
  backendBase: string;
  onSelectPerk: (perk: Perk) => void;
  t: CharacterDetailDictionary;
}

export const CharacterPerksSection: React.FC<CharacterPerksSectionProps> = ({
  perks,
  character,
  backendBase,
  onSelectPerk,
  t,
}) => {
  const [disabledModalPerk, setDisabledModalPerk] = useState<PerkItem | null>(null);

  if (perks.length === 0) return null;

  return (
    <div className="my-auto grid w-full grid-cols-fit-perk gap-4 pt-2 sm:gap-6">
      {perks.map((perk, idx) => {
        const iconSrc = getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url);

        return (
          <div
            key={`${perk.name}-${idx}`}
            className="relative flex justify-center"
            {...tip(perk.name, undefined, 'item')}
          >
            <TileButton
              onClick={() =>
                onSelectPerk({
                  name: perk.name,
                  category: perk.category,
                  character: perk.character || character.name,
                  character_avatar_path: perk.character_avatar_path || character.avatar_local_path,
                  description: perk.description,
                  icon_url: perk.icon_url || '',
                  icon_local_path: perk.icon_local_path || '',
                })
              }
              className="flex w-full max-w-40 flex-col items-center gap-2 rounded-control p-1 transition-all duration-300"
              aria-label={`${perk.name} - ${t.clickToInspect}`}
            >
              <img
                src={iconSrc}
                alt=""
                className={`aspect-square w-full object-contain ${
                  perk.is_disabled ? 'grayscale opacity-50' : ''
                }`}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="line-clamp-2 min-h-10 text-center type-card-title text-text-primary">{perk.name}</span>
            </TileButton>

            {perk.is_disabled && (
              <DisabledBadge label={perk.name} onClick={() => setDisabledModalPerk(perk)} />
            )}
          </div>
        );
      })}

      <DisabledReasonModal
        isOpen={disabledModalPerk !== null}
        onClose={() => setDisabledModalPerk(null)}
        label={disabledModalPerk?.name || ''}
        reason={disabledModalPerk?.disabled_reason}
      />
    </div>
  );
};
