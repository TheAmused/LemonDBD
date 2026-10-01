'use client';
// frontend/src/components/tier-lists/TierListBoard.tsx

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { TierDefinition, TierItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { type BoardContainers, findContainer, moveItem } from '@/utils/tierLists/board';
import { POOL_CONTAINER_ID } from '@/utils/tierLists/constants';
import { TierItemPreviewModal } from './TierItemPreviewModal';
import { TierItemTile, type TierTileShape } from './TierItemTile';
import { TierPool } from './TierPool';
import { TierRow } from './TierRow';
import { parseContainerDndId, parseItemDndId } from './dndIds';

interface TierListBoardProps {
  items: TierItem[];
  tiers: TierDefinition[];
  board: BoardContainers;
  /** Called once per completed move -- a drop, or a tap-to-move -- never mid-drag. */
  onBoardChange: (board: BoardContainers) => void;
  onEditTier: (tierId: string) => void;
  selectedKey: string | null;
  onSelectedKeyChange: (key: string | null) => void;
  shape: TierTileShape;
  showNames: boolean;
  poolEmptyLabel: string;
  dict: Dictionary;
}

/**
 * Pointer-first collision detection: whatever is under the finger wins, items
 * before the container they sit in (so a drop lands *next to* an item rather
 * than at the end of its row). Keyboard drags have no pointer and fall back
 * to the nearest corners.
 */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length) {
    const itemHits = hits.filter((hit) => parseItemDndId(hit.id) !== null);
    return itemHits.length ? itemHits : hits;
  }
  return closestCorners(args);
};

function sameBoard(a: BoardContainers, b: BoardContainers): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => {
    const x = a[k];
    const y = b[k];
    return y !== undefined && x.length === y.length && x.every((v, i) => v === y[i]);
  });
}

export function TierListBoard({
  items,
  tiers,
  board,
  onBoardChange,
  onEditTier,
  selectedKey,
  onSelectedKeyChange,
  shape,
  showNames,
  poolEmptyLabel,
  dict,
}: TierListBoardProps) {
  const t = dict.tierLists;
  const itemsByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const catalogOrder = useMemo(() => items.map((i) => i.key), [items]);

  // While dragging, the board lives here so items can hop between rows on
  // every pointer move without writing to localStorage 60 times a second.
  const [dragBoard, setDragBoardState] = useState<BoardContainers | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const startBoard = useRef<BoardContainers | null>(null);
  // Mirrors `dragBoard` synchronously: dnd-kit can fire dragEnd right after a
  // dragOver, before React has re-rendered with the board that dragOver set.
  const dragBoardRef = useRef<BoardContainers | null>(null);
  const setDragBoard = useCallback((next: BoardContainers | null) => {
    dragBoardRef.current = next;
    setDragBoardState(next);
  }, []);
  const shown = dragBoard ?? board;

  const sensors = useSensors(
    // A few pixels of travel before a mouse drag starts, so a click selects.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch, in the tier rows and the pool alike: a short hold (with room for finger drift) picks a tile up;
    // a plain swipe still scrolls the area it started in.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 14 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const containerLabel = useCallback(
    (containerId: string | null) => {
      if (containerId === POOL_CONTAINER_ID) return t.unranked;
      return tiers.find((tier) => tier.id === containerId)?.label ?? '';
    },
    [tiers, t.unranked]
  );

  const nameOf = useCallback(
    (dndId: string | number) => itemsByKey.get(parseItemDndId(dndId) ?? '')?.name ?? '',
    [itemsByKey]
  );

  const targetOf = useCallback(
    (dndId: string | number | undefined, current: BoardContainers) => {
      const overKey = parseItemDndId(dndId);
      return containerLabel(overKey ? findContainer(current, overKey) : parseContainerDndId(dndId));
    },
    [containerLabel]
  );

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) => t.dnd.pickedUp.replace('{name}', nameOf(active.id)),
      onDragOver: ({ active, over }) =>
        over
          ? t.dnd.movedOver.replace('{name}', nameOf(active.id)).replace('{target}', targetOf(over.id, shown))
          : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? t.dnd.dropped.replace('{name}', nameOf(active.id)).replace('{target}', targetOf(over.id, shown))
          : t.dnd.cancelled.replace('{name}', nameOf(active.id)),
      onDragCancel: ({ active }) => t.dnd.cancelled.replace('{name}', nameOf(active.id)),
    }),
    [t.dnd, nameOf, targetOf, shown]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const key = parseItemDndId(event.active.id);
      if (!key) return;
      startBoard.current = board;
      setDragBoard(board);
      setActiveKey(key);
      onSelectedKeyChange(null);
    },
    [board, onSelectedKeyChange, setDragBoard]
  );

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const key = parseItemDndId(active.id);
      const current = dragBoardRef.current;
      if (!key || !over || !current) return;
      const from = findContainer(current, key);
      const overKey = parseItemDndId(over.id);
      const to = overKey ? findContainer(current, overKey) : parseContainerDndId(over.id);
      if (!from || !to || from === to) return;

      // Entering another row: land before or after the hovered item,
      // whichever side of it the dragged tile's centre is on.
      let index = overKey ? current[to].indexOf(overKey) : current[to].length;
      const dragged = active.rect.current.translated;
      if (overKey && dragged && dragged.left + dragged.width / 2 > over.rect.left + over.rect.width / 2) {
        index += 1;
      }
      setDragBoard(moveItem(current, key, to, index, catalogOrder));
    },
    [catalogOrder, setDragBoard]
  );

  const finishDrag = useCallback(() => {
    setDragBoard(null);
    setActiveKey(null);
    startBoard.current = null;
  }, [setDragBoard]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const key = parseItemDndId(active.id);
      const current = dragBoardRef.current;
      const start = startBoard.current;
      finishDrag();
      if (!key || !current || !start || !over) return;

      let next = current;
      const container = findContainer(current, key);
      const overKey = parseItemDndId(over.id);
      // Reordering inside one tier. The pool has no order of its own.
      if (container && container !== POOL_CONTAINER_ID && overKey && overKey !== key && current[container].includes(overKey)) {
        const list = current[container];
        next = { ...current, [container]: arrayMove(list, list.indexOf(key), list.indexOf(overKey)) };
      }
      if (!sameBoard(next, start)) onBoardChange(next);
    },
    [finishDrag, onBoardChange]
  );

  const handleSelect = useCallback(
    (key: string) => onSelectedKeyChange(selectedKey === key ? null : key),
    [selectedKey, onSelectedKeyChange]
  );

  const handlePreview = useCallback((key: string) => setPreviewKey(key), []);
  const closePreview = useCallback(() => setPreviewKey(null), []);

  const handleMoveSelectedHere = useCallback(
    (containerId: string) => {
      if (!selectedKey) return;
      const next = moveItem(board, selectedKey, containerId, undefined, catalogOrder);
      onSelectedKeyChange(null);
      if (!sameBoard(next, board)) onBoardChange(next);
    },
    [board, selectedKey, catalogOrder, onBoardChange, onSelectedKeyChange]
  );

  const activeItem = activeKey ? itemsByKey.get(activeKey) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={finishDrag}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t.dnd.instructions } }}
    >
      {/* The page never scrolls (short landscape screens excepted). The rows take the height they need and scroll in their own area once they would overflow; the pool header sits right under them. The rows' cap always leaves room for the OPEN pool, so collapsing or expanding the pool never moves anything above or at its header. */}
      <div className="flex flex-col w-full flex-1 min-h-0 gap-3 sm:gap-4 [--pool-h:min(50dvh,30rem)] sm:[--pool-h:min(40dvh,26rem)] [--pool-head:6.5rem] sm:[--pool-head:4rem]">
        <div className="flex flex-col gap-2 w-full min-h-0 flex-initial overflow-y-auto overscroll-contain pr-1 [&>*]:shrink-0 max-h-[calc(100%-var(--pool-h)-1rem)] [@media(max-height:559px)]:max-h-none [@media(max-height:559px)]:overflow-visible">
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              keys={shown[tier.id] ?? []}
              itemsByKey={itemsByKey}
              shape={shape}
              showNames={showNames}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              onPreview={handlePreview}
              onMoveSelectedHere={handleMoveSelectedHere}
              onEdit={onEditTier}
              dict={dict}
            />
          ))}
        </div>

        <TierPool
          keys={shown[POOL_CONTAINER_ID] ?? []}
          itemsByKey={itemsByKey}
          shape={shape}
          showNames={showNames}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          onPreview={handlePreview}
          onMoveSelectedHere={handleMoveSelectedHere}
          emptyLabel={poolEmptyLabel}
          dict={dict}
        />
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeItem ? <TierItemTile item={activeItem} shape={shape} showName={showNames} overlay /> : null}
      </DragOverlay>

      <TierItemPreviewModal item={previewKey ? itemsByKey.get(previewKey) ?? null : null} onClose={closePreview} />
    </DndContext>
  );
}
