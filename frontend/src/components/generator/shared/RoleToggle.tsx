'use client';
// frontend/src/components/generator/shared/RoleToggle.tsx
//
// Survivor/Killer picker as an actual toggle switch (a single track with a
// sliding amber thumb) instead of two separate pill buttons -- lives bare,
// directly over the stage, with no banner/background around it.

import React from 'react';

import { RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

export interface RoleToggleProps {
  role: RoleCategory;
  onChange: (role: RoleCategory) => void;
  className?: string;
  dict?: Dictionary;
}

export const RoleToggle: React.FC<RoleToggleProps> = ({ role, onChange, className, dict }) => {
  const isKiller = role === 'Killer';

  return (
    <div
      role="group"
      aria-label={dict?.generator?.selectRole || 'Select Role'}
      className={cn(
        'inline-flex items-center rounded-xl border border-border-color bg-bg-elevated p-1 shadow-inner shrink-0',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange('Survivor')}
        aria-pressed={!isKiller}
        className={cn(
          'flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-lg text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer select-none touch-manipulation',
          !isKiller
            ? 'bg-accent-green text-text-inverted shadow-xs font-black hover:brightness-110 active:scale-95'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/70 active:scale-95'
        )}
      >
        <SurvivorIcon className="h-4 w-4 sm:h-5 w-5 shrink-0" />
        <span>{dict?.generator?.survivor || 'Survivor'}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('Killer')}
        aria-pressed={isKiller}
        className={cn(
          'flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-lg text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer select-none touch-manipulation',
          isKiller
            ? 'bg-accent-red text-text-inverted shadow-xs font-black hover:brightness-110 active:scale-95'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/70 active:scale-95'
        )}
      >
        <KillerIcon className="h-4 w-4 sm:h-5 w-5 shrink-0" />
        <span>{dict?.generator?.killer || 'Killer'}</span>
      </button>
    </div>
  );
};
