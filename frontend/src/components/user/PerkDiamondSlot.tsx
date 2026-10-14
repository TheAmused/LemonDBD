'use client';
import React from 'react';
import { Plus, X } from 'lucide-react';
import type { Perk } from '@/types/perks';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { DiamondSlot } from '@/components/ui/DiamondSlot';
import { PerkTile } from '@/components/streaks/page-streak/PerkTile';

interface PerkDiamondSlotProps {
  slotIndex: number;
  perk?: Perk | null;
  perkId?: number | null;
  onClick: () => void;
  onClear?: (e: React.MouseEvent) => void;
  emptyLabel?: string;
  clearLabel?: string;
}

/**
 * One of the four loadout slots, as wide as the diamond itself (`--perk-size`, set by the card).
 * Empty and filled slots share that box, so picking perks never moves the layout. A filled slot
 * is the bare perk icon, the PerkTile every other page uses; an empty one is a dashed DiamondSlot
 * sized to fill the same footprint (a diamond's frame is 1/sqrt(2) of the width it covers).
 */
export const PerkDiamondSlot: React.FC<PerkDiamondSlotProps> = ({
  perk,
  onClick,
  onClear,
  emptyLabel: emptyLabelProp,
  clearLabel: clearLabelProp,
}) => {
  const dict = useDictionary();
  const emptyLabel = emptyLabelProp ?? dict.user.emptySlot;
  const clearLabel = clearLabelProp ?? dict.user.clearPerk;

  const iconUrl = perk ? getPerkIconUrl(perk) : null;

  return (
    <div className="relative group h-[var(--perk-size)] w-[var(--perk-size)]">
      {perk ? (
        <PerkTile name={perk.name} iconSrc={iconUrl ?? undefined} onToggle={() => onClick()} />
      ) : (
        <DiamondSlot
          dashed
          onClick={onClick}
          ariaLabel={emptyLabel}
          className="absolute inset-[14.65%] h-auto w-auto sm:h-auto sm:w-auto"
          {...tip(emptyLabel, undefined, 'action')}
        >
          <Plus className="h-5 w-5 text-text-muted transition-colors group-hover:text-accent-amber" />
        </DiamondSlot>
      )}

      {/* Clear button on hover when perk is present, sitting on the diamond's upper right edge */}
      {perk && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          {...tip(clearLabel, undefined, 'action')} aria-label={clearLabel}
          className="hit-area absolute left-[75%] top-[25%] z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-red text-text-inverted shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:opacity-90 transition-all cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
