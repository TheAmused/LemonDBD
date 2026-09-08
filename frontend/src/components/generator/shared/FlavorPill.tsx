// frontend/src/components/generator/shared/FlavorPill.tsx
'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface FlavorPillProps {
  flavorLine?: string | null;
  className?: string;
}

export const FlavorPill: React.FC<FlavorPillProps> = ({ flavorLine, className }) => {
  if (!flavorLine) return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        'max-w-xs sm:max-w-md mx-auto px-4 py-1.5 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-400/50 dark:border-amber-500/40 text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 text-center shadow-md animate-fade-in break-words transition-colors',
        className
      )}
    >
      {flavorLine}
    </div>
  );
};
