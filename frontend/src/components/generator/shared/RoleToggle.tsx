'use client';
// frontend/src/components/generator/shared/RoleToggle.tsx
//
// Survivor/Killer picker as an actual toggle switch (a single track with a
// sliding amber thumb) instead of two separate pill buttons -- lives bare,
// directly over the stage, with no banner/background around it.

import React from 'react';
import { Shield, Skull } from 'lucide-react';
import { RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';

export interface RoleToggleProps {
  role: RoleCategory;
  onChange: (role: RoleCategory) => void;
  className?: string;
  dict?: Dictionary;
}

export const RoleToggle: React.FC<RoleToggleProps> = ({ role, onChange, className, dict }) => {
  const isKiller = role === 'Killer';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isKiller}
      aria-label={
        isKiller
          ? dict?.generator?.roleToggleToSurvivor || 'Switch to Survivor perks'
          : dict?.generator?.roleToggleToKiller || 'Switch to Killer perks'
      }
      onClick={() => onChange(isKiller ? 'Survivor' : 'Killer')}
      className={cn(
        'relative flex h-8 w-[76px] shrink-0 items-center rounded-full border border-white/10 bg-slate-950/70 px-1 cursor-pointer transition-colors duration-200 touch-manipulation',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-200 ease-out',
          isKiller ? 'left-[45px] bg-rose-500 text-slate-950' : 'left-1 bg-emerald-400 text-slate-950'
        )}
      >
        {isKiller ? <Skull className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
      </span>
      <span className={cn('ml-1 text-[9px] font-black uppercase tracking-wide transition-opacity', isKiller ? 'opacity-30 text-emerald-300' : 'opacity-0')}>
        S
      </span>
      <span className={cn('ml-auto mr-1 text-[9px] font-black uppercase tracking-wide transition-opacity', isKiller ? 'opacity-0' : 'opacity-30 text-rose-300')}>
        K
      </span>
    </button>
  );
};
