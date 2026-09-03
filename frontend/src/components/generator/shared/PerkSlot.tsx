// frontend/src/components/generator/shared/PerkSlot.tsx
'use client';

import React from 'react';
import { ImageOff, EyeOff } from 'lucide-react';
import { Perk, RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { PerkCard } from '@/components/PerkCard';

// Matches PerkCard's own grid-view footprint exactly, so an empty/obscured
// slot takes up the same space as a filled one and nothing jumps around.
const SLOT_SIZE_CLASSES: Record<'default' | 'large' | 'fill' | 'tarot', string> = {
  default: 'h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-48 lg:w-48 xl:h-56 xl:w-56 2xl:h-64 2xl:w-64',
  large: 'h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64 xl:h-72 xl:w-72',
  fill: 'h-[min(88cqh,88cqw)] w-[min(88cqh,88cqw)] max-h-48 max-w-48',
  tarot: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44',
};

export interface PerkSlotProps {
  perk?: Perk | null;
  /** Unused internally now that display is delegated to PerkCard; kept so
   * callers don't need to change their existing prop lists. */
  role?: RoleCategory;
  /** Page number (1-based) — pass together with `slot` for the [P/S] tag. */
  page?: number;
  /** Slot number *within that page* (1-based, matches the Vault's own paging). */
  slot?: number;
  isObscured?: boolean;
  isActive?: boolean;
  announce?: boolean;
  /** 'large' is used by every mode's result grid; the Wheel's flanking
   * loadout slots stay at 'default'; 'tarot' fits inside tarot cards. */
  size?: 'default' | 'large' | 'fill' | 'tarot';
  /** Persistent Blind Mode -- distinct from `isObscured` (the Chaos
   * "Curse of Blindness" mutator), which does NOT show the coordinate tag.
   * Blind Mode always shows it. */
  isBlind?: boolean;
  onClick?: () => void;
  dict?: Dictionary;
}

export const PerkSlot: React.FC<PerkSlotProps> = ({
  perk,
  page,
  slot,
  isObscured = false,
  isActive = false,
  announce = false,
  size = 'default',
  isBlind = false,
  onClick,
  dict,
}) => {
  if (isObscured) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          SLOT_SIZE_CLASSES[size],
          'flex flex-col items-center justify-center gap-1.5 rounded-2xl text-purple-400 cursor-pointer'
        )}
      >
        <EyeOff className="h-10 w-10 animate-pulse" />
        <span className="text-[11px] font-black uppercase tracking-wide text-center px-2">
          {dict?.generator?.clickToReveal || '??? (Click to Reveal)'}
        </span>
      </button>
    );
  }

  if (!perk) {
    return (
      <div
        className={cn(
          SLOT_SIZE_CLASSES[size],
          'flex flex-col items-center justify-center gap-1.5 text-slate-600'
        )}
      >
        <ImageOff className="h-8 w-8" />
        <span className="text-[11px] font-bold text-slate-500 text-center px-2">
          {dict?.generator?.emptySlot || 'Empty Slot'}
        </span>
      </div>
    );
  }

  const coordinate = page !== undefined && slot !== undefined ? { page, slot } : undefined;

  return (
    <div className={cn('relative', isActive && 'rounded-2xl ring-2 ring-amber-500/60')}>
      <PerkCard
        perk={perk}
        onSelect={() => onClick?.()}
        dict={dict}
        coordinate={coordinate}
        size={size}
        isBlind={isBlind}
      />

      {announce && !isBlind && (
        <span aria-live="polite" className="sr-only">
          {perk.name}
        </span>
      )}
    </div>
  );
};
