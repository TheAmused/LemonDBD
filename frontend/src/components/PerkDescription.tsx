'use client';
// frontend/src/components/PerkDescription.tsx

import React from 'react';
import { RichText } from '@/components/common/RichText';

interface PerkDescriptionProps {
  description: string;
  variant?: 'modal' | 'tooltip';
}

/** Layout wrapper for seed descriptions; all markup rendering is RichText's. */
export const PerkDescription: React.FC<PerkDescriptionProps> = ({
  description,
  variant = 'modal',
}) => {
  if (!description) return null;

  const isTooltip = variant === 'tooltip';

  return (
    <div
      className={
        isTooltip
          ? 'space-y-1 text-xs text-text-primary'
          : 'space-y-2.5 text-xs sm:text-sm leading-relaxed text-justify hyphens-auto [overflow-wrap:break-word] font-normal text-text-secondary [&_p]:text-text-secondary [&_li]:text-text-secondary [&_strong]:text-accent-amber [&_strong]:font-bold [&_b]:text-accent-amber [&_b]:font-bold'
      }
    >
      <RichText text={description} block variant="game" compact={isTooltip} />
    </div>
  );
};
