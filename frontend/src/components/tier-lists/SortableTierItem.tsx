'use client';
// frontend/src/components/tier-lists/SortableTierItem.tsx

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TierItem } from '@/types/tierList';
import { TierItemTile, type TierTileShape } from './TierItemTile';
import { itemDndId } from './dndIds';

interface SortableTierItemProps {
  item: TierItem;
  shape: TierTileShape;
  showName: boolean;
  selected: boolean;
  onSelect: (key: string) => void;
}

/**
 * A tile wired into dnd-kit. A short tap never starts a drag (the sensors
 * need movement or a hold), so the same tile doubles as the tap-to-select
 * target for the no-drag flow.
 */
export const SortableTierItem = React.memo(function SortableTierItem({
  item,
  shape,
  showName,
  selected,
  onSelect,
}: SortableTierItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemDndId(item.key),
  });

  return (
    <TierItemTile
      ref={setNodeRef}
      item={item}
      shape={shape}
      showName={showName}
      selected={selected}
      ghost={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.key);
      }}
      {...attributes}
      {...listeners}
      aria-pressed={selected}
    />
  );
});
