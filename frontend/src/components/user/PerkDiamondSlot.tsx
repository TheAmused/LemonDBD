import React from 'react';
import { Plus, X, Sparkles } from 'lucide-react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import type { Perk } from '@/types/perks';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';

import { DiamondSlot } from '@/components/ui/DiamondSlot';

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
  emptyLabel: emptyLabelProp,
  clearLabel: clearLabelProp,
}) => {
  const dict = useDictionary();
  const emptyLabel = emptyLabelProp ?? dict.user.emptySlot;
  const clearLabel = clearLabelProp ?? dict.user.clearPerk;

  const iconUrl = perk ? getPerkIconUrl(perk) : null;

  return (
    <div className="relative flex flex-col items-center group">
      {/* 45-degree diamond container */}
      <DiamondSlot
        size="md"
        active={!!perk}
        dashed={!perk}
        onClick={onClick}
        ariaLabel={perk?.name || emptyLabel}
        className={perk ? 'bg-bg-elevated' : undefined}
        {...tip(perk?.name || emptyLabel, undefined, perk ? 'item' : 'action')}
      >
        {perk ? (
          <PerkIcon
            perk={perk}
            src={iconUrl}
            className="w-10 h-10"
            imageClassName="object-contain drop-shadow-md w-full h-full"
            fallbackIcon={<Sparkles className="h-5 w-5 text-accent-red" />}
          />
        ) : (
          <Plus className="h-5 w-5 text-text-muted group-hover:text-accent-amber transition-colors" />
        )}
      </DiamondSlot>

      {/* Clear button on hover when perk is present */}
      {perk && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          {...tip(clearLabel, undefined, 'action')} aria-label={clearLabel}
          className="hit-area absolute -top-1 -right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-text-inverted shadow-md opacity-0 group-hover:opacity-100 hover:opacity-90 transition-all cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Label under diamond */}
      {perk ? (
        <span className="mt-2 type-strong-2xs text-center max-w-[84px] truncate text-text-muted group-hover:text-accent-amber transition-colors">
          {perk.name}
        </span>
      ) : (
        <span className="sr-only">{emptyLabel}</span>
      )}
    </div>
  );
};
