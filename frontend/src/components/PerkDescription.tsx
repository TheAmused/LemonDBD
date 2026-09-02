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
          ? 'space-y-1 text-xs text-slate-200'
          : 'space-y-2.5 text-xs sm:text-sm leading-relaxed font-normal text-slate-700 dark:text-slate-300 [&_p]:text-slate-700 dark:[&_p]:text-slate-300 [&_li]:text-slate-700 dark:[&_li]:text-slate-300'
      }
    >
      {renderFormattedDbdText(description, {
        isCompact: isTooltip,
        highlightName: perkName,
      })}
    </div>
  );
};
