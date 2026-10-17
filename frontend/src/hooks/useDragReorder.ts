'use client';
// frontend/src/hooks/useDragReorder.ts
//
// THE drag-to-reorder behaviour for vertical lists, over Pointer Events (mouse, touch, pen). The hook only
// decides which row the grabbed one should swap with; the caller moves the item in its own state (`onMove`)
// and saves on `onDrop`.
//
//   const drag = useDragReorder<number>({ onMove: moveById, onDrop: save });
//   <li ref={drag.rowRef(id)}> <button {...drag.handleProps(id)} /> </li>

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

export interface UseDragReorderOptions<Id extends string | number> {
  enabled?: boolean;
  /** Called while dragging each time the grabbed row should take the place of another one. */
  onMove: (fromId: Id, toId: Id) => void;
  /** Called once when a drag that really started has ended. */
  onDrop?: () => void;
  /** Touch only: how long the press must last before a drag starts, so scrolling past a handle still works. */
  touchHoldMs?: number;
}

export interface DragReorder<Id extends string | number> {
  draggingId: Id | null;
  rowRef: (id: Id) => (el: HTMLElement | null) => void;
  handleProps: (id: Id) => { onPointerDown: (e: ReactPointerEvent) => void; style: CSSProperties };
}

const HANDLE_STYLE: CSSProperties = { touchAction: 'none' };

export function useDragReorder<Id extends string | number>(options: UseDragReorderOptions<Id>): DragReorder<Id> {
  const { enabled = true, touchHoldMs = 0 } = options;
  const [draggingId, setDraggingId] = useState<Id | null>(null);
  const rows = useRef(new Map<Id, HTMLElement>());
  // The window listeners outlive a render, so they read the latest callbacks from here.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => () => detachRef.current?.(), []);

  const rowRef = useCallback(
    (id: Id) => (el: HTMLElement | null) => {
      if (el) rows.current.set(id, el);
      else rows.current.delete(id);
    },
    []
  );

  const nearestRowId = (clientY: number): Id | null => {
    let nearest: Id | null = null;
    let nearestDistance = Infinity;
    rows.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = id;
      }
    });
    return nearest;
  };

  const startDrag = (id: Id, e: ReactPointerEvent) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const holdFirst = e.pointerType === 'touch' && touchHoldMs > 0;
    if (!holdFirst) e.preventDefault();
    detachRef.current?.();

    let active = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const begin = () => {
      active = true;
      setDraggingId(id);
    };

    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      ev.preventDefault();
      const overId = nearestRowId(ev.clientY);
      if (overId !== null && overId !== id) optionsRef.current.onMove(id, overId);
    };
    const detach = () => {
      if (holdTimer) clearTimeout(holdTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      detachRef.current = null;
    };
    const onEnd = () => {
      detach();
      if (!active) return;
      setDraggingId(null);
      optionsRef.current.onDrop?.();
    };

    detachRef.current = detach;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    if (holdFirst) holdTimer = setTimeout(begin, touchHoldMs);
    else begin();
  };

  const handleProps = (id: Id) => ({ onPointerDown: (e: ReactPointerEvent) => startDrag(id, e), style: HANDLE_STYLE });

  return { draggingId, rowRef, handleProps };
}
