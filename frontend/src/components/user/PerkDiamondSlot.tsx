// frontend/src/components/user/PerkDiamondSlot.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import type { Perk } from '@/types/perks';
import { getPerkIconUrl } from '@/utils/perkUtils';

interface PerkDiamondSlotProps {
  slotIndex: number;
  perk?: Perk | null;
  perkId?: number | null;
  onClick: () => void;
  onClear?: (e: React.MouseEvent) => void;
  emptyLabel?: string;
  clearLabel?: string;
}

export const PerkDiamondSlot: React.FC<PerkDiamondSlotProps> = ({
  slotIndex,
  perk,
  onClick,
  onClear,
  emptyLabel = 'Empty Slot',
  clearLabel = 'Clear Perk',
}) => {
  const iconUrl = perk ? getPerkIconUrl(perk) : null;

  return (
    <div className="relative flex flex-col items-center group">
      {/* 45-degree diamond container */}
      <button
        type="button"
        onClick={onClick}
        className={`relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rotate-45 rounded-xl border-2 transition-all cursor-pointer shadow-md ${
          perk
            ? 'border-purple-500/80 bg-gradient-to-br from-purple-900/90 via-slate-900 to-purple-950/90 hover:scale-105 hover:border-purple-400 hover:shadow-purple-500/20'
            : 'border-dashed border-slate-400/40 dark:border-slate-700/60 bg-slate-100/60 dark:bg-slate-900/40 hover:border-amber-500/60 hover:bg-amber-500/5 hover:scale-105'
        }`}
        title={perk?.name || emptyLabel}
        aria-label={perk?.name || emptyLabel}
      >
        {/* Un-rotated inside content */}
        <div className="-rotate-45 relative flex items-center justify-center w-full h-full pointer-events-none">
          {perk && iconUrl ? (
            <Image
              src={iconUrl}
              alt={perk.name}
              width={42}
              height={42}
              className="object-contain drop-shadow-md"
              unoptimized
            />
          ) : (
            <Plus className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-amber-500 transition-colors" />
          )}
        </div>
      </button>

      {/* Clear button on hover when perk is present */}
      {perk && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          title={clearLabel}
          className="absolute -top-1 -right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-md opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Label under diamond */}
      <span className="mt-2 text-[10px] font-bold text-center max-w-[80px] truncate text-slate-600 dark:text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
        {perk ? perk.name : emptyLabel}
      </span>
    </div>
  );
};
