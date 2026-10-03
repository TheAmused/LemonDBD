'use client';
// frontend/src/components/tier-lists/TierListBoard.tsx

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type UniqueIdentifier,
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
import { SidewaysPointerSensor } from './touchSensors';
import { TierRow } from './TierRow';
import { parseContainerDndId, parseItemDndId } from './dndIds';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

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
}

/**
 * Pointer-first collision detection: whatever is under the finger wins, items
 * before the container they sit in (so a drop lands *next to* an item rather
 * than at the end of its row). With the finger over no droppable at all (the
 * header, a gap), the last target stays: re-guessing from the dragged tile's
 * corners there made the tile hop between rows and the pool on every layout
 * change -- an endless render loop. Keyboard drags have no pointer and use the
 * nearest corners.
 */
function createCollisionDetection(lastOver: { current: UniqueIdentifier | null }): CollisionDetection {
  return (args) => {
    const hits = args.pointerCoordinates ? pointerWithin(args) : [];
    if (hits.length) {
      const itemHits = hits.filter((hit) => parseItemDndId(hit.id) !== null);
      const result = itemHits.length ? itemHits : hits;
      lastOver.current = result[0].id;
      return result;
    }
    if (args.pointerCoordinates) return lastOver.current === null ? [] : [{ id: lastOver.current }];
    return closestCorners(args);
  };
}

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
    }: TierListBoardProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const itemsByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const catalogOrder = useMemo(() => items.map((i) => i.key), [items]);

  // While dragging, the board lives here so items can hop between rows on
  // every pointer move without writing to localStorage 60 times a second.
  const [dragBoard, setDragBoardState] = useState<BoardContainers | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const startBoard = useRef<BoardContainers | null>(null);
  const lastOver = useRef<UniqueIdentifier | null>(null);
  const lastHop = useRef<{ from: string; to: string; at: number } | null>(null);
  const collisionDetection = useMemo(() => createCollisionDetection(lastOver), []);
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
    // Touch, in the tier rows and the pool alike: a sideways drag picks a tile up at once (tiles only claim
    // vertical panning, so an up/down swipe still scrolls). One touch sensor only: two of them (pointer + touch
    // events) would both start a drag from the same finger.
    useSensor(SidewaysPointerSensor, { activationConstraint: { distance: { x: 10 } } }),
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
      onDragStart: ({ active }) => formatMessage(t.dnd.pickedUp, { name: nameOf(active.id) }),
      onDragOver: ({ active, over }) =>
        over
          ? formatMessage(t.dnd.movedOver, { name: nameOf(active.id), target: targetOf(over.id, shown) })
          : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? formatMessage(t.dnd.dropped, { name: nameOf(active.id), target: targetOf(over.id, shown) })
          : formatMessage(t.dnd.cancelled, { name: nameOf(active.id) }),
      onDragCancel: ({ active }) => formatMessage(t.dnd.cancelled, { name: nameOf(active.id) }),
    }),
    [t.dnd, nameOf, targetOf, shown]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const key = parseItemDndId(event.active.id);
      if (!key) return;
      startBoard.current = board;
      lastOver.current = null;
      lastHop.current = null;
      setDragBoard(board);
      setActiveKey(key);
      onSelectedKeyChange(null);
    },
    [board, onSelectedKeyChange, setDragBoard]
  );

  /** The board with the dragged tile moved into the container under the pointer, or null if it is already there. */
  const hopTo = useCallback(
    (active: DragOverEvent['active'], over: NonNullable<DragOverEvent['over']>, current: BoardContainers) => {
      const key = parseItemDndId(active.id);
      if (!key) return null;
      const from = findContainer(current, key);
      const overKey = parseItemDndId(over.id);
      const to = overKey ? findContainer(current, overKey) : parseContainerDndId(over.id);
      if (!from || !to || from === to) return null;

      // Entering another row: land before or after the hovered item,
      // whichever side of it the dragged tile's centre is on.
      let index = overKey ? current[to].indexOf(overKey) : current[to].length;
      const dragged = active.rect.current.translated;
      if (overKey && dragged && dragged.left + dragged.width / 2 > over.rect.left + over.rect.width / 2) {
        index += 1;
      }
      return { board: moveItem(current, key, to, index, catalogOrder), from, to };
    },
    [catalogOrder]
  );

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const current = dragBoardRef.current;
      if (!over || !current) return;
      const hop = hopTo(active, over, current);
      if (!hop) return;
      // A hop reflows the layout, which can put the pointer over the container it just left, and that hops back,
      // and so on without end. Going straight back within a moment is ignored; the drop reconciles (see handleDragEnd).
      const now = Date.now();
      const last = lastHop.current;
      if (last && last.from === hop.to && last.to === hop.from && now - last.at < 150) return;
      lastHop.current = { from: hop.from, to: hop.to, at: now };
      setDragBoard(hop.board);
    },
    [hopTo, setDragBoard]
  );

  const finishDrag = useCallback(() => {
    setDragBoard(null);
    setActiveKey(null);
    startBoard.current = null;
    lastOver.current = null;
  }, [setDragBoard]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const key = parseItemDndId(active.id);
      const current = dragBoardRef.current;
      const start = startBoard.current;
      finishDrag();
      if (!key || !current || !start || !over) return;

      // The last dragOver may have been skipped (see handleDragOver): put the tile where it was dropped.
      const hop = hopTo(active, over, current);
      const landed = hop ? hop.board : current;

      let next = landed;
      const container = findContainer(landed, key);
      const overKey = parseItemDndId(over.id);
      // Reordering inside one tier. The pool has no order of its own.
      if (container && container !== POOL_CONTAINER_ID && overKey && overKey !== key && landed[container].includes(overKey)) {
        const list = landed[container];
        next = { ...landed, [container]: arrayMove(list, list.indexOf(key), list.indexOf(overKey)) };
      }
      if (!sameBoard(next, start)) onBoardChange(next);
    },
    [finishDrag, hopTo, onBoardChange]
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
        />
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeItem ? <TierItemTile item={activeItem} shape={shape} showName={showNames} overlay /> : null}
      </DragOverlay>

      <TierItemPreviewModal item={previewKey ? itemsByKey.get(previewKey) ?? null : null} onClose={closePreview} />
    </DndContext>
  );
}
