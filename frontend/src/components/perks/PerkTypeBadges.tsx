'use client';
// frontend/src/components/perks/PerkTypeBadges.tsx
//
// The perk types of one perk, shown in the perk modal: small labels, primary first, all equally
// visible, wrapping onto as many rows as they need. A perk that carries no known type shows nothing here:
// the fallback type of unclassified perks would claim something the data does not say.
import React from 'react';
import { InfoChip } from '@/components/common/InfoChip';
import { useDictionary } from '@/context/DictionaryContext';
import type { Perk } from '@/types/perks';
import { readKnownPerkTypes } from '@/utils/perkTypes';
import { cn } from '@/utils/cn';

interface PerkTypeBadgesProps {
  perk: Pick<Perk, 'perk_types'>;
  className?: string;
}

export const PerkTypeBadges: React.FC<PerkTypeBadgesProps> = ({ perk, className }) => {
  const dict = useDictionary();
  const types = readKnownPerkTypes(perk);
  if (types.length === 0) return null;
  return (
    <span className={cn('flex w-full min-w-0 flex-wrap justify-center gap-1.5', className)}>
      {types.map((type) => (
        <InfoChip key={type}>
          {dict.perkTypes.labels[type]}
        </InfoChip>
      ))}
    </span>
  );
};
