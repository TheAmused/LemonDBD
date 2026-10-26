'use client';
// frontend/src/components/maps/MapLayoutView.tsx
/**
 * Draws a map's footprint (`MapRealm.layout`) to scale: one SVG user unit is one metre. The full
 * view adds the 8 m squares, the 16 m game tiles, the 12-clock callouts (computed from the
 * outline, see utils/mapLayout.ts) and a scale bar. The thumbnail view draws every map inside the
 * same frame, so thumbnails can be compared by size at a glance.
 */
import React, { useId, useMemo } from 'react';
import type { MapLayout } from '@/types/map';
import { clockLabels, floorBounds, ringsToPath, GAME_TILE_M } from '@/utils/mapLayout';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { MapLandmarks } from '@/components/maps/MapLandmarks';

/** Thumbnail frame in metres; the largest maps are 144 m along their long side. */
const THUMB_FRAME_M = 152;
/** Margin around the full view, in metres. */
const PAD_M = 8;
const SCALE_BAR_M = 32;

export interface MapLayoutViewProps extends Omit<React.SVGProps<SVGSVGElement>, 'viewBox'> {
  layout: MapLayout;
  /** Accessible name, usually the map's name. */
  title: string;
  floorIndex?: number;
  variant?: 'full' | 'thumb';
}

function gridLines(width: number, height: number, step: number): string {
  let d = '';
  for (let x = step; x < width; x += step) d += `M${x} 0V${height}`;
  for (let y = step; y < height; y += step) d += `M0 ${y}H${width}`;
  return d;
}

export const MapLayoutView: React.FC<MapLayoutViewProps> = ({
  layout,
  title,
  floorIndex = 0,
  variant = 'full',
  className,
  ...rest
}) => {
  const dict = useDictionary();
  // useId() can contain ':' or '«»', which do not survive inside url(#...): keep it to safe characters.
  const clipId = `map-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const floor = layout.floors[Math.min(floorIndex, layout.floors.length - 1)];
  const floorPath = useMemo(() => ringsToPath(floor.outline), [floor]);
  const blockedPath = useMemo(() => ringsToPath(floor.blocked ?? []), [floor]);
  const clock = useMemo(() => (variant === 'full' ? clockLabels(floor) : null), [floor, variant]);
  const { width_m: width, height_m: height } = layout;

  if (variant === 'thumb') {
    const b = floorBounds(floor);
    const x0 = (b.minX + b.maxX) / 2 - THUMB_FRAME_M / 2;
    const y0 = (b.minY + b.maxY) / 2 - THUMB_FRAME_M / 2;
    return (
      <svg
        viewBox={`${x0} ${y0} ${THUMB_FRAME_M} ${THUMB_FRAME_M}`}
        className={className}
        {...rest}
      >
        <title>{title}</title>
        <path d={floorPath} className="fill-accent-red/15 stroke-text-primary" strokeWidth={2} strokeLinejoin="round" />
        {blockedPath && <path d={blockedPath} className="fill-text-muted/40" />}
      </svg>
    );
  }

  return (
    <svg
      viewBox={`${-PAD_M} ${-PAD_M} ${width + PAD_M * 2} ${height + PAD_M * 3}`}
      className={className}
      {...rest}
    >
      <title>{title}</title>
      <defs>
        <clipPath id={clipId}>
          <path d={floorPath} />
        </clipPath>
      </defs>
      <path d={floorPath} className="fill-bg-elevated" />
      <g clipPath={`url(#${clipId})`} fill="none">
        <path d={gridLines(width, height, layout.cell_m)} className="stroke-border-color" strokeWidth={0.3} />
        <path
          d={gridLines(width, height, GAME_TILE_M)}
          className="stroke-text-muted/60"
          strokeWidth={0.45}
          strokeDasharray="1.5 1.2"
        />
      </g>
      {blockedPath && <path d={blockedPath} className="fill-text-muted/40 stroke-text-muted" strokeWidth={0.4} />}
      <path d={floorPath} fill="none" className="stroke-accent-red" strokeWidth={1.1} strokeLinejoin="round" />
      {floor.landmarks && floor.landmarks.length > 0 && <MapLandmarks landmarks={floor.landmarks} />}
      {clock && (
        <g className="pointer-events-none select-none font-bold" textAnchor="middle" dominantBaseline="central">
          {clock.labels.map((l) => (
            <text key={l.hour} x={l.x} y={l.y} fontSize={6} className="fill-text-primary">
              {l.hour}
            </text>
          ))}
          {clock.showMid && (
            <text x={clock.center[0]} y={clock.center[1]} fontSize={3.6} className="fill-text-muted">
              {dict.maps.calloutMid}
            </text>
          )}
        </g>
      )}
      <g className="pointer-events-none select-none" transform={`translate(0 ${height + PAD_M * 0.9})`}>
        <path d={`M0 -1.2V0H${SCALE_BAR_M}V-1.2`} fill="none" className="stroke-text-muted" strokeWidth={0.5} />
        <text x={SCALE_BAR_M + 2} y={0} fontSize={3.2} dominantBaseline="central" className="fill-text-muted">
          {formatMessage(dict.maps.metresValue, { value: SCALE_BAR_M })}
        </text>
      </g>
    </svg>
  );
};
