'use client';
// frontend/src/components/tier-lists/TierRow.tsx

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownToLine, Eraser, GripVertical, Pencil } from 'lucide-react';
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
  onClearRow?: (tierId: string) => void;
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
      onClearRow,
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
        'grid grid-cols-tier-label-xs phone-lg:grid-cols-tier-label-sm sm:max-wide-2k:grid-cols-tier-label-md wide-2k:grid-cols-tier-label-lg overflow-hidden rounded-card border border-border-color bg-bg-surface shadow-xs group-data-[fit]/board:grid-cols-[var(--badge-w)_minmax(0,1fr)]!',
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
          className="group relative min-h-14 phone-lg:min-h-18 sm:max-wide-2k:min-h-21 wide-2k:min-h-28 group-data-[fit]/board:min-h-0! overflow-hidden text-center cursor-grab active:cursor-grabbing touch-none transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-amber"
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
            'relative min-h-14 phone-lg:min-h-18 sm:max-wide-2k:min-h-21 wide-2k:min-h-28 group-data-[fit]/board:min-h-0! overflow-hidden text-center select-none',
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

      <div className="flex min-w-0">
      <div
        ref={setNodeRef}
        onClick={canReceiveSelection ? () => onMoveSelectedHere(tier.id) : undefined}
        className={cn(
          'relative flex min-w-0 flex-1 min-h-14 phone-lg:min-h-18 sm:max-wide-2k:min-h-21 wide-2k:min-h-28 flex-wrap content-start items-start justify-start gap-1 phone-lg:gap-1.5 sm:gap-2 p-1.5 phone-lg:p-2 transition-colors',
          'group-data-[fit]/board:min-h-(--row-min)! group-data-[fit]/board:gap-(--tile-gap)! group-data-[fit]/board:p-(--tile-pad)!',
          // FIT: rows are stretched to fill the screen, so centre the tiles instead of hugging the top edge.
          'group-data-[fit]/board:content-center group-data-[fit]/board:items-center',
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

      {/* Far right, on every row, for everyone who can rank: one click empties the row. Empty rows keep a spacer so the column never changes width. */}
      {onClearRow && (
        <div className="flex shrink-0 items-center px-1.5 sm:px-2">
          {keys.length > 0 ? (
            <Button
              type="button"
              variant="overlay"
              size="xs"
              icon
              pill
              onClick={(e) => {
                e.stopPropagation();
                onClearRow(tier.id);
              }}
              aria-label={formatMessage(t.clearTierAria, { label: tier.label })}
              title={formatMessage(t.clearTierAria, { label: tier.label })}
              className="opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : (
            <span aria-hidden="true" className="h-6 w-6" />
          )}
        </div>
      )}
      </div>
    </section>
  );
});
