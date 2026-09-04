import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, X, Sparkles } from 'lucide-react';
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
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [perk?.id]);

  const iconUrl = perk ? getPerkIconUrl(perk) : null;

  return (
    <div className="relative flex flex-col items-center group">
      {/* 45-degree diamond container */}
      <button
        type="button"
        onClick={onClick}
        className={`relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rotate-45 rounded-xl border-2 transition-all cursor-pointer shadow-md ${
          perk
            ? 'border-purple-500/80 bg-gradient-to-br from-purple-950/80 via-bg-surface to-purple-900/80 hover:scale-105 hover:border-purple-400 hover:shadow-purple-500/25'
            : 'border-dashed border-border-color bg-bg-elevated/40 hover:border-accent-amber/60 hover:bg-accent-amber/5 hover:scale-105'
        }`}
        title={perk?.name || emptyLabel}
        aria-label={perk?.name || emptyLabel}
      >
        {/* Un-rotated inside content */}
        <div className="-rotate-45 relative flex items-center justify-center w-full h-full pointer-events-none">
          {perk && iconUrl && !imgError ? (
            <Image
              src={iconUrl}
              alt={perk.name}
              width={42}
              height={42}
              className="object-contain drop-shadow-md"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : perk ? (
            <Sparkles className="h-5 w-5 text-purple-400" />
          ) : (
            <Plus className="h-5 w-5 text-text-muted group-hover:text-accent-amber transition-colors" />
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
          className="absolute -top-1 -right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-text-inverted shadow-md opacity-0 group-hover:opacity-100 hover:opacity-90 transition-all cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Label under diamond */}
      <span className="mt-2.5 text-[10px] font-mono font-bold text-center max-w-[84px] truncate text-text-muted group-hover:text-accent-amber transition-colors">
        {perk ? perk.name : emptyLabel}
      </span>
    </div>
  );
};
