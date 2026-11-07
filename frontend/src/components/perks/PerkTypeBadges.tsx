'use client';
// frontend/src/components/perks/PerkTypeBadges.tsx
//
// The perk types of one perk, shown in the perk modal: small labels, primary first, all equally
// visible, wrapping onto as many rows as they need.
import React from 'react';
import { InfoChip } from '@/components/common/InfoChip';
import { useDictionary } from '@/context/DictionaryContext';
import type { Perk } from '@/types/perks';
import { getKnownPerkTypes } from '@/utils/perkTypes';
import { cn } from '@/utils/cn';

interface PerkTypeBadgesProps {
  perk: Perk;
  className?: string;
}

export const PerkTypeBadges: React.FC<PerkTypeBadgesProps> = ({ perk, className }) => {
  const dict = useDictionary();
  return (
    <span className={cn('flex w-full min-w-0 flex-wrap justify-center gap-1.5', className)}>
      {getKnownPerkTypes(perk).map((type) => (
        <InfoChip key={type}>
          {dict.perkTypes.labels[type]}
        </InfoChip>
      ))}
    </span>
  );
};
