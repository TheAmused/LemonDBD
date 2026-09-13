// frontend/src/components/generator/shared/PerkSlot.tsx
'use client';

import React from 'react';
import { ImageOff, EyeOff } from 'lucide-react';
import { Perk, RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { PerkCard } from '@/components/PerkCard';

export type PerkSlotSize = 'default' | 'large' | 'fill' | 'tarot' | 'compact';

// Matches PerkCard's own grid-view footprint exactly, so an empty/obscured
// slot takes up the same space as a filled one and nothing jumps around.
const SLOT_SIZE_CLASSES: Record<PerkSlotSize, string> = {
  default: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44 2xl:h-52 2xl:w-52 min-[1800px]:h-60 min-[1800px]:w-60',
  large: 'h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-44 lg:w-44 xl:h-52 xl:w-52 2xl:h-60 2xl:w-60 min-[1800px]:h-68 min-[1800px]:w-68',
  fill: 'h-[min(88cqh,88cqw)] w-[min(88cqh,88cqw)] max-h-48 max-w-48',
  tarot: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44 2xl:h-52 2xl:w-52 min-[1800px]:h-60 min-[1800px]:w-60',
  compact: 'h-[78px] w-[78px] xs:h-[84px] xs:w-[84px] sm:h-24 sm:w-24 md:h-26 md:w-26',
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
   * loadout slots stay at 'default'; 'tarot' fits inside tarot cards; 'compact' for mobile scatter. */
  size?: PerkSlotSize;
  /** Persistent Blind Mode -- distinct from `isObscured` (the Chaos
   * "Curse of Blindness" mutator), which does NOT show the coordinate tag.
   * Blind Mode always shows it. */
  isBlind?: boolean;
  onClick?: () => void;
  dict?: Dictionary;
}

const SLOT_OUTER_PADDING: Record<PerkSlotSize, string> = {
  default: 'p-2 sm:p-3',
  large: 'p-2 sm:p-3',
  fill: 'p-1',
  tarot: 'p-0.5',
  compact: 'p-0.5',
};

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
      <div className={cn('flex items-center justify-center w-full', SLOT_OUTER_PADDING[size])}>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            SLOT_SIZE_CLASSES[size],
            'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-purple-400/50 dark:border-purple-800/60 bg-purple-50/90 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400 cursor-pointer shadow-xs transition-colors backdrop-blur-xs'
          )}
        >
          <EyeOff className="h-10 w-10 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wide text-center px-2">
            {dict?.generator?.clickToReveal || '??? (Click to Reveal)'}
          </span>
        </button>
      </div>
    );
  }

  if (!perk) {
    return (
      <div className={cn('flex items-center justify-center w-full', SLOT_OUTER_PADDING[size])}>
        <div
          className={cn(
            SLOT_SIZE_CLASSES[size],
            'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border-color bg-bg-surface/90 text-slate-400 dark:text-slate-500 transition-colors shadow-xs backdrop-blur-xs'
          )}
        >
          <ImageOff className="h-8 w-8 text-slate-400 dark:text-slate-600" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center px-2">
            {dict?.generator?.emptySlot || 'Empty Slot'}
          </span>
        </div>
      </div>
    );
  }

  const coordinate = page !== undefined && slot !== undefined ? { page, slot } : undefined;

  return (
    <div className={cn('relative', isActive && 'rounded-2xl ring-2 ring-accent-red/60')}>
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
