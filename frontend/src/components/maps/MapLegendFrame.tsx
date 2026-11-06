'use client';
// frontend/src/components/maps/MapLegendFrame.tsx
/**
 * The card around the map legend: it folds to its title bar and, from `sm` up, can be dragged (or moved with
 * the arrow keys) anywhere over the map area. Whether it is folded and where it sits is remembered in
 * localStorage. On a phone the legend is a strip under the header: always open, never moved.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronIcon } from '@/components/icons/DbdIcons';
import { IconSvg } from '@/components/icons/IconSvg';
import { Surface } from '@/components/common/Surface';
import { cn } from '@/utils/cn';
import { clampLegendPosition, useMapLegendState, type LegendPosition } from '@/hooks/useMapLegendState';

const KEY_STEP = 16;
const KEY_STEP_FAST = 64;
const HEADER_BUTTON =
  'flex shrink-0 items-center justify-center rounded-control p-1 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red';

export interface MapLegendFrameProps {
  title: string;
  toggleLabel: string;
  moveLabel: string;
  className?: string;
  children: React.ReactNode;
}

export const MapLegendFrame: React.FC<MapLegendFrameProps> = ({ title, toggleLabel, moveLabel, className, children }) => {
  const [state, update] = useMapLegendState();
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [wide, setWide] = useState(false);
  const [fitted, setFitted] = useState<LegendPosition | null>(null);
  const [dragging, setDragging] = useState<LegendPosition | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const clampToParent = useCallback((position: LegendPosition): LegendPosition => {
    const el = rootRef.current;
    const parent = el?.offsetParent;
    if (!el || !parent) return position;
    return clampLegendPosition(
      position,
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: parent.clientWidth, height: parent.clientHeight }
    );
  }, []);

  // The saved position, pulled back inside the map area whenever the window or the legend's size changes.
  useEffect(() => {
    const fit = () => {
      setDragging(null);
      setFitted(wide && state.position ? clampToParent(state.position) : null);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [state.position, state.collapsed, wide, clampToParent]);

  const shown = dragging ?? fitted;

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const el = rootRef.current;
    if (!el || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: el.offsetLeft, originY: el.offsetTop };
  };
  const dragTarget = (event: React.PointerEvent<HTMLButtonElement>): LegendPosition | null => {
    const drag = dragRef.current;
    if (!drag) return null;
    return clampToParent({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const next = dragTarget(event);
    if (next) setDragging(next);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const next = dragTarget(event);
    dragRef.current = null;
    if (next) update({ position: next });
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const el = rootRef.current;
    if (!el) return;
    if (event.key === 'Home') {
      event.preventDefault();
      update({ position: null });
      return;
    }
    const step = event.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const origin = shown ?? { x: el.offsetLeft, y: el.offsetTop };
    update({ position: clampToParent({ x: origin.x + move[0], y: origin.y + move[1] }) });
  };

  return (
    <div
      ref={rootRef}
      className={cn(className, !shown && 'sm:left-6 sm:top-20')}
      style={wide && shown ? { left: shown.x, top: shown.y } : undefined}
      data-testid="map-legend-frame"
    >
      <Surface
        as="aside"
        aria-label={title}
        tone="elevated"
        padding="none"
        stripOnPhone
        className="px-4 py-2.5 sm:bg-bg-elevated/90 sm:p-4 sm:backdrop-blur-xl sm:shadow-2xl wide-2k:p-5 wide-4k:p-6 sm:max-h-dvh-72 sm:overflow-y-auto"
      >
        <div className="max-sm:hidden flex items-center gap-1.5">
          <button
            type="button"
            aria-label={moveLabel}

            data-testid="map-legend-grip"
            className={cn(HEADER_BUTTON, 'cursor-grab touch-none active:cursor-grabbing')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragRef.current = null;
              setDragging(null);
            }}
            onKeyDown={onKeyDown}
            onDoubleClick={() => update({ position: null })}
          >
            <IconSvg className="icon-md" strokeWidth={3}>
              <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
            </IconSvg>
          </button>
          <h3 className="min-w-0 flex-1 type-label-screen text-text-muted">{title}</h3>
          <button
            type="button"
            aria-label={toggleLabel}

            aria-expanded={!state.collapsed}
            aria-controls={contentId}
            data-testid="map-legend-toggle"
            className={HEADER_BUTTON}
            onClick={() => update({ collapsed: !state.collapsed })}
          >
            <ChevronIcon className={cn('icon-md transition-transform', state.collapsed ? 'rotate-90' : '-rotate-90')} />
          </button>
        </div>
        {/* Folding only hides the body from `sm` up: a phone's strip stays open. */}
        <div id={contentId} className={cn(state.collapsed && 'hidden max-sm:block')}>
          {children}
        </div>
      </Surface>
    </div>
  );
};
