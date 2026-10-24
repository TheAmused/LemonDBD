'use client';
// frontend/src/components/perks/PerkTypeBadges.tsx
//
// A perk's types, primary first and the secondary ones dimmed. With
// `onSelectType` each is a filter button (the Perks page); otherwise a label.
import React from 'react';
import { InfoChip } from '@/components/common/InfoChip';
import { ToggleChip } from '@/components/common/ToggleChip';
import { useDictionary } from '@/context/DictionaryContext';
import type { Perk } from '@/types/perks';
import { getKnownPerkTypes, type PerkType } from '@/utils/perkTypes';
import { cn } from '@/utils/cn';

interface PerkTypeBadgesProps {
  perk: Perk;
  onSelectType?: (type: PerkType) => void;
  activeTypes?: readonly PerkType[];
  className?: string;
}

const NO_TYPES: readonly PerkType[] = [];

export const PerkTypeBadges: React.FC<PerkTypeBadgesProps> = ({ perk, onSelectType, activeTypes = NO_TYPES, className }) => {
  const dict = useDictionary();
  return (
    <fieldset aria-label={dict.perkTypes.typesHeading} className={cn('flex min-w-0 flex-wrap justify-center gap-1.5', className)}>
      {getKnownPerkTypes(perk).map((type, index) => {
        const dim = index > 0 ? 'opacity-75' : undefined;
        return onSelectType ? (
          <ToggleChip key={type} size="xs" pill pressed={activeTypes.includes(type)} className={dim} onClick={() => onSelectType(type)}>
            {dict.perkTypes.labels[type]}
          </ToggleChip>
        ) : (
          <InfoChip key={type} className={dim}>
            {dict.perkTypes.labels[type]}
          </InfoChip>
        );
      })}
    </fieldset>
  );
};
