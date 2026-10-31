'use client';
// frontend/src/components/perks/PerkTypeBadges.tsx
//
// The perk types under a perk card: one row of small labels, primary first and
// the secondary ones dimmed. The ones that do not fit the tile width are left
// out (the secondary ones drop first). The labels take the cursor of the tile they sit in.
import React from 'react';
import { INFO_CHIP_XS_ROW, InfoChip } from '@/components/common/InfoChip';
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
    <span className={cn('flex w-full min-w-0 flex-wrap justify-center gap-1 overflow-hidden', INFO_CHIP_XS_ROW, className)}>
      {getKnownPerkTypes(perk).map((type, index) => (
        <InfoChip key={type} size="xs" className={cn('cursor-[inherit]', index > 0 && 'opacity-75')}>
          {dict.perkTypes.labels[type]}
        </InfoChip>
      ))}
    </span>
  );
};
