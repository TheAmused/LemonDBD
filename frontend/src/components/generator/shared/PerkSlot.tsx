'use client';

import React from 'react';
import { ImageOff, EyeOff, Trash2 } from 'lucide-react';
import { Perk, RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { PerkCard } from '@/components/PerkCard';

// Matches PerkCard's own grid-view footprint exactly, so an empty/obscured
// slot takes up the same space as a filled one and nothing jumps around.
const SLOT_SIZE_CLASSES =
  'h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48';

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
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
  dict?: Dictionary;
}

export const PerkSlot: React.FC<PerkSlotProps> = ({
  perk,
  page,
  slot,
  isObscured = false,
  isActive = false,
  announce = false,
  onClick,
  onClear,
  dict,
}) => {
  if (isObscured) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          SLOT_SIZE_CLASSES,
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
          SLOT_SIZE_CLASSES,
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
      <PerkCard perk={perk} onSelect={() => onClick?.()} dict={dict} coordinate={coordinate} />

      {announce && (
        <span aria-live="polite" className="sr-only">
          {perk.name}
        </span>
      )}

      {onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          aria-label={dict?.generator?.clearSlotTooltip || 'Clear slot'}
          className="absolute bottom-1 right-1 z-20 rounded-lg bg-slate-950/60 p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
