'use client';
// frontend/src/components/tier-lists/TierRow.tsx

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { ArrowDownToLine, Pencil } from 'lucide-react';
import type { TierDefinition, TierItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { SortableTierItem } from './SortableTierItem';
import { TierBadge } from './TierBadge';
import type { TierTileShape } from './TierItemTile';
import { containerDndId, itemDndId } from './dndIds';

interface TierRowProps {
  tier: TierDefinition;
  keys: string[];
  itemsByKey: ReadonlyMap<string, TierItem>;
  shape: TierTileShape;
  showNames: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onPreview: (key: string) => void;
  onMoveSelectedHere: (containerId: string) => void;
  onEdit: (tierId: string) => void;
  dict: Dictionary;
}

export const TierRow = React.memo(function TierRow({
  tier,
  keys,
  itemsByKey,
  shape,
  showNames,
  selectedKey,
  onSelect,
  onPreview,
  onMoveSelectedHere,
  onEdit,
  dict,
}: TierRowProps) {
  const t = dict.tierLists;
  const { setNodeRef, isOver } = useDroppable({ id: containerDndId(tier.id) });
  const canReceiveSelection = selectedKey !== null && !keys.includes(selectedKey);

  return (
    <section
      aria-label={t.tierAria.replace('{label}', tier.label)}
      className="grid grid-cols-[4.75rem_minmax(0,1fr)] sm:max-wide-2k:grid-cols-[6.5rem_minmax(0,1fr)] wide-2k:grid-cols-[9rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border-color bg-bg-surface shadow-xs"
    >
      <button
        type="button"
        onClick={() => onEdit(tier.id)}
        aria-label={t.editTierAria.replace('{label}', tier.label)}
        className="group relative min-h-[72px] sm:max-wide-2k:min-h-[84px] wide-2k:min-h-[112px] overflow-hidden text-center cursor-pointer transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-amber"
      >
        <TierBadge
          label={tier.label}
          color={tier.color}
          backgroundImage={tier.backgroundImage}
          className="absolute inset-0 flex items-center justify-center p-2"
          labelClassName="font-black leading-tight break-words text-lg sm:max-wide-2k:text-2xl wide-2k:text-4xl line-clamp-3 [overflow-wrap:anywhere]"
        />
        <Pencil
          className="absolute right-1.5 top-1.5 z-10 h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-90 drop-shadow"
          aria-hidden="true"
        />
      </button>

      <div
        ref={setNodeRef}
        onClick={canReceiveSelection ? () => onMoveSelectedHere(tier.id) : undefined}
        className={cn(
          'relative flex min-h-[72px] sm:max-wide-2k:min-h-[84px] wide-2k:min-h-[112px] flex-wrap content-start items-start gap-1.5 sm:gap-2 p-2 transition-colors',
          isOver && 'bg-accent-red/10',
          canReceiveSelection && 'cursor-pointer hover:bg-accent-amber/10'
        )}
      >
        <SortableContext items={keys.map(itemDndId)} strategy={rectSortingStrategy}>
          {keys.map((key) => {
            const item = itemsByKey.get(key);
            return item ? (
              <SortableTierItem
                key={key}
                item={item}
                shape={shape}
                showName={showNames}
                selected={selectedKey === key}
                onSelect={onSelect}
                onPreview={onPreview}
              />
            ) : null;
          })}
        </SortableContext>

        {keys.length === 0 && !canReceiveSelection && (
          <span className="pointer-events-none self-center px-2 text-xs font-semibold text-text-muted">
            {t.dropHere}
          </span>
        )}

        {canReceiveSelection && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveSelectedHere(tier.id);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 self-center rounded-xl border border-dashed border-accent-amber/60 bg-accent-amber/10 px-3 text-xs font-bold text-accent-amber cursor-pointer"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
            {t.moveHere}
          </button>
        )}
      </div>
    </section>
  );
});
