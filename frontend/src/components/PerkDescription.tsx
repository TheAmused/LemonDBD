'use client';
// frontend/src/components/PerkDescription.tsx

import React from 'react';
import { renderFormattedDbdText } from '@/utils/textFormatter';

interface PerkDescriptionProps {
  description: string;
  perkName?: string;
  variant?: 'modal' | 'tooltip';
}

export const PerkDescription: React.FC<PerkDescriptionProps> = ({
  description,
  perkName = '',
  variant = 'modal',
}) => {
  if (!description) return null;

  const isTooltip = variant === 'tooltip';

  return (
    <div
      className={
        isTooltip
          ? 'space-y-1 text-xs text-text-primary'
          : 'space-y-2.5 text-xs sm:text-sm leading-relaxed font-normal text-text-secondary [&_p]:text-text-secondary [&_li]:text-text-secondary [&_strong]:text-accent-amber [&_strong]:font-bold [&_b]:text-accent-amber [&_b]:font-bold'
      }
    >
      {renderFormattedDbdText(description, {
        isCompact: isTooltip,
        highlightName: perkName,
      })}
    </div>
  );
};

