'use client';
// frontend/src/components/perks/PerkTypeBadges.tsx
//
// The perk types of one perk: small labels, primary first and the secondary ones dimmed.
// Under a perk card ('xs') it is one row, and the ones that do not fit the tile width are left
// out (the secondary ones drop first); the labels take the cursor of the tile they sit in.
// In the perk modal ('md') the labels wrap onto as many rows as they need.
import React from 'react';
import { INFO_CHIP_XS_ROW, InfoChip, type InfoChipSize } from '@/components/common/InfoChip';
import { useDictionary } from '@/context/DictionaryContext';
import type { Perk } from '@/types/perks';
import { getKnownPerkTypes } from '@/utils/perkTypes';
import { cn } from '@/utils/cn';

interface PerkTypeBadgesProps {
  perk: Perk;
  size?: InfoChipSize;
  className?: string;
}

export const PerkTypeBadges: React.FC<PerkTypeBadgesProps> = ({ perk, size = 'xs', className }) => {
  const dict = useDictionary();
  const row = size === 'xs' ? cn('gap-1 overflow-hidden', INFO_CHIP_XS_ROW) : 'gap-1.5';
  return (
    <span className={cn('flex w-full min-w-0 flex-wrap justify-center', row, className)}>
      {getKnownPerkTypes(perk).map((type, index) => (
        <InfoChip key={type} size={size} className={cn('cursor-[inherit]', index > 0 && 'opacity-75')}>
          {dict.perkTypes.labels[type]}
        </InfoChip>
      ))}
    </span>
  );
};
