// frontend/src/components/user/PerkDiamondSlot.tsx
import { useDictionary } from '@/context/DictionaryContext';
import React from 'react';
import { Plus, X } from 'lucide-react';
import type { Perk } from '@/types/perks';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { PerkTile } from '@/components/streaks/page-streak/PerkTile';

import { tip } from '@/components/common/Tooltip';
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
 * is the bare perk icon, the PerkTile every other page uses; an empty one is a dashed diamond.
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
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-[14.65%] flex rotate-45 items-center justify-center rounded-xl border-2 border-dashed border-border-color bg-bg-elevated/40 shadow-md transition-all cursor-pointer hover:scale-105 hover:border-accent-amber/60 hover:bg-accent-amber/5"
          {...tip(emptyLabel, undefined, 'action')}
          aria-label={emptyLabel}
        >
          <Plus className="-rotate-45 h-5 w-5 text-text-muted transition-colors group-hover:text-accent-amber" />
        </button>
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
