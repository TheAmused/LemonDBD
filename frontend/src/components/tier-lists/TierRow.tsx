'use client';
// frontend/src/components/tier-lists/TierRow.tsx

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownToLine, GripVertical, Pencil } from 'lucide-react';
import type { TierDefinition, TierItem } from '@/types/tierList';
import { cn } from '@/utils/cn';
import { SortableTierItem } from './SortableTierItem';
import { TierBadge } from './TierBadge';
import type { TierTileShape } from './TierItemTile';
import { containerDndId, itemDndId, tierDndId } from './dndIds';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

import { Button } from '@/components/common/Button';
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
  canEdit?: boolean;
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
      canEdit = true,
    }: TierRowProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const { setNodeRef, isOver } = useDroppable({ id: containerDndId(tier.id) });
  const {
    attributes,
    listeners,
    setNodeRef: setTierRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tierDndId(tier.id), disabled: !canEdit });
  const canReceiveSelection = selectedKey !== null && !keys.includes(selectedKey);
  const handleItemSelect = React.useCallback(
    (key: string) => {
      if (canReceiveSelection) onMoveSelectedHere(tier.id);
      else onSelect(key);
    },
    [canReceiveSelection, onMoveSelectedHere, tier.id, onSelect]
  );

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section
      ref={setTierRef}
      style={style}
      aria-label={formatMessage(t.tierAria, { label: tier.label })}
      className={cn(
        'grid grid-cols-[3.5rem_minmax(0,1fr)] min-[480px]:grid-cols-[4.75rem_minmax(0,1fr)] sm:max-wide-2k:grid-cols-[6.5rem_minmax(0,1fr)] wide-2k:grid-cols-[9rem_minmax(0,1fr)] overflow-hidden rounded-card border border-border-color bg-bg-surface shadow-xs group-data-[fit]/board:grid-cols-[var(--badge-w)_minmax(0,1fr)]!',
        isDragging && 'z-20 relative border-accent-amber opacity-90'
      )}
    >
      {canEdit ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={() => (canReceiveSelection ? onMoveSelectedHere(tier.id) : onEdit(tier.id))}
          aria-label={formatMessage(t.editTierAria, { label: tier.label })}
          className="group relative min-h-14 min-[480px]:min-h-18 sm:max-wide-2k:min-h-21 wide-2k:min-h-[112px] group-data-[fit]/board:min-h-0! overflow-hidden text-center cursor-grab active:cursor-grabbing touch-none transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-amber"
        >
          <TierBadge
            label={tier.label}
            color={tier.color}
            backgroundImage={tier.backgroundImage}
            className="absolute inset-0 flex items-center justify-center p-2"
            labelClassName="font-black leading-tight text-lg sm:max-wide-2k:text-2xl wide-2k:text-4xl group-data-[fit]/board:text-(length:--badge-fs)!"
          />
          <GripVertical
            className="absolute left-1 top-1.5 z-10 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60 drop-shadow"
            aria-hidden="true"
          />
          <Pencil
            className="absolute right-1.5 top-1.5 z-10 h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-90 drop-shadow"
            aria-hidden="true"
          />
        </button>
      ) : (
        <div
          onClick={canReceiveSelection ? () => onMoveSelectedHere(tier.id) : undefined}
          className={cn(
            'relative min-h-14 min-[480px]:min-h-18 sm:max-wide-2k:min-h-21 wide-2k:min-h-[112px] group-data-[fit]/board:min-h-0! overflow-hidden text-center select-none',
            canReceiveSelection && 'cursor-pointer hover:brightness-95'
          )}
        >
          <TierBadge
            label={tier.label}
            color={tier.color}
            backgroundImage={tier.backgroundImage}
            className="absolute inset-0 flex items-center justify-center p-2"
            labelClassName="font-black leading-tight text-lg sm:max-wide-2k:text-2xl wide-2k:text-4xl group-data-[fit]/board:text-(length:--badge-fs)!"
          />
        </div>
      )}

      <div
        ref={setNodeRef}
        onClick={canReceiveSelection ? () => onMoveSelectedHere(tier.id) : undefined}
        className={cn(
          'relative flex min-h-14 min-[480px]:min-h-18 sm:max-wide-2k:min-h-21 wide-2k:min-h-[112px] flex-wrap content-start items-start justify-start gap-1 min-[480px]:gap-1.5 sm:gap-2 p-1.5 min-[480px]:p-2 transition-colors',
          'group-data-[fit]/board:min-h-(--row-min)! group-data-[fit]/board:gap-(--tile-gap)! group-data-[fit]/board:p-(--tile-pad)!',
          keys.length === 0 && 'content-center items-center justify-center',
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
                onSelect={handleItemSelect}
                onPreview={onPreview}
              />
            ) : null;
          })}
        </SortableContext>

        {keys.length === 0 && !canReceiveSelection && (
          <span className="pointer-events-none self-center px-2 text-sm sm:text-base font-semibold text-text-muted">
            {t.dropHere}
          </span>
        )}

        {canReceiveSelection && (
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveSelectedHere(tier.id);
            }}
            variant="amberSoft" size="sm" dashed className="min-h-11 group-data-[fit]/board:min-h-0 group-data-[fit]/board:py-0.5 self-center"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
            {t.moveHere}
          </Button>
        )}
      </div>
    </section>
  );
});
