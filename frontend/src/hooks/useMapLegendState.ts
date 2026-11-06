'use client';
// frontend/src/hooks/useMapLegendState.ts

import { useCallback, useMemo } from 'react';
import { readStoredItem, useStoredItem } from '@/hooks/useStoredItem';

export const MAP_LEGEND_STORAGE_KEY = 'lemondbd:map-legend';

/** Offset of the legend's top-left corner from the top-left corner of the map area, in px. */
export interface LegendPosition {
  x: number;
  y: number;
}

export interface LegendState {
  collapsed: boolean;
  /** Null: the legend stays where the layout puts it. */
  position: LegendPosition | null;
}

const DEFAULT_LEGEND_STATE: LegendState = { collapsed: false, position: null };

const isCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The saved legend state; anything unreadable or stale is the default (open, in its place). */
export function parseLegendState(raw: string | null): LegendState {
  if (!raw) return DEFAULT_LEGEND_STATE;
  try {
    const saved = JSON.parse(raw) as { collapsed?: unknown; x?: unknown; y?: unknown } | null;
    if (!saved || typeof saved !== 'object') return DEFAULT_LEGEND_STATE;
    const position = isCoordinate(saved.x) && isCoordinate(saved.y) ? { x: saved.x, y: saved.y } : null;
    return { collapsed: saved.collapsed === true, position };
  } catch {
    return DEFAULT_LEGEND_STATE;
  }
}

export function serializeLegendState(state: LegendState): string {
  return JSON.stringify({
    collapsed: state.collapsed,
    ...(state.position ? { x: Math.round(state.position.x), y: Math.round(state.position.y) } : {}),
  });
}

/** Keeps a box of `size` fully inside `bounds`, whatever the window did since the position was saved. */
export function clampLegendPosition(
  position: LegendPosition,
  size: { width: number; height: number },
  bounds: { width: number; height: number }
): LegendPosition {
  return {
    x: Math.min(Math.max(0, position.x), Math.max(0, bounds.width - size.width)),
    y: Math.min(Math.max(0, position.y), Math.max(0, bounds.height - size.height)),
  };
}

/** Whether the map legend is folded and where the viewer put it, kept in localStorage. */
export function useMapLegendState() {
  const [raw, write] = useStoredItem(MAP_LEGEND_STORAGE_KEY);
  const state = useMemo(() => parseLegendState(raw), [raw]);
  const update = useCallback(
    (patch: Partial<LegendState>) =>
      write(serializeLegendState({ ...parseLegendState(readStoredItem(MAP_LEGEND_STORAGE_KEY)), ...patch })),
    [write]
  );
  return [state, update] as const;
}
