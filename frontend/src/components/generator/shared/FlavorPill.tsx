// frontend/src/components/generator/shared/FlavorPill.tsx
'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface FlavorPillProps {
  flavorLine?: string | null;
  className?: string;
}

export const FlavorPill: React.FC<FlavorPillProps> = ({ flavorLine, className }) => {
  return (
    <div
      aria-live="polite"
      className={cn(
        'max-w-xs sm:max-w-md mx-auto min-h-[44px] sm:min-h-[52px] px-4 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/40 text-xs sm:text-sm font-black text-accent-green text-center shadow-xs animate-fade-in break-words transition-colors flex items-center justify-center',
        !flavorLine && 'invisible',
        className
      )}
    >
      {flavorLine || ' '}
    </div>
  );
};
