'use client';
// frontend/src/components/maps/MapLandmarks.tsx
/**
 * The fixed landmarks of one floor, drawn inside MapLayoutView's metre-based SVG. A landmark with
 * a size is drawn as its footprint in metres (dashed where the size is an estimate); one without
 * is a marker chip. The main building and the shack carry the same icons as the map badges
 * (Building2, Home); any other fixed feature shows its short callout code.
 */
import React from 'react';
import { Building2, Home } from 'lucide-react';
import type { MapLandmark } from '@/types/map';
import { useDictionary } from '@/context/DictionaryContext';
import { getFeatureLandmarkName } from '@/utils/mapLandmarkLabels';

/** Marker chip size in metres, for landmarks without a footprint. */
const CHIP_M = 9;
const TEXT_CHIP_H_M = 6;
const ICON_MAX_M = 7;

const FOOTPRINT_CLASS: Record<MapLandmark['kind'], string> = {
  main: 'fill-accent-red/30 stroke-accent-red',
  shack: 'fill-text-primary/25 stroke-text-primary',
  feature: 'fill-text-muted/30 stroke-text-muted',
};

function LandmarkContent({ lm, size }: { lm: MapLandmark; size: number }) {
  if (lm.kind === 'feature') {
    return (
      <text
        x={lm.x}
        y={lm.y}
        fontSize={3.4}
        textAnchor="middle"
        dominantBaseline="central"
        className={lm.w ? 'fill-text-primary font-bold' : 'fill-bg-primary font-bold'}
      >
        {lm.label}
      </text>
    );
  }
  const Icon = lm.kind === 'main' ? Building2 : Home;
  return (
    <Icon
      x={lm.x - size / 2}
      y={lm.y - size / 2}
      width={size}
      height={size}
      strokeWidth={2.4}
      className={lm.w ? (lm.kind === 'main' ? 'text-accent-red' : 'text-text-primary') : lm.kind === 'main' ? 'text-text-inverted' : 'text-bg-primary'}
      aria-hidden="true"
    />
  );
}

export const MapLandmarks: React.FC<{ landmarks: readonly MapLandmark[] }> = ({ landmarks }) => {
  const dict = useDictionary();
  const name = (lm: MapLandmark) => {
    if (lm.kind === 'main') return dict.maps.mainBuildingYes;
    if (lm.kind === 'shack') return dict.maps.shackYes;
    if (lm.kind === 'feature') {
      const full = getFeatureLandmarkName(lm.label || '', dict);
      return lm.label && lm.label !== full ? `${lm.label} — ${full}` : full || lm.label || '';
    }
    return lm.label || '';
  };
  return (
    <g className="pointer-events-none select-none">
      {landmarks.map((lm, i) => {
        if (lm.w && lm.h) {
          const rotate = lm.angle ? `rotate(${lm.angle} ${lm.x} ${lm.y})` : undefined;
          return (
            <g key={i} className="pointer-events-auto">
              <title>{name(lm)}</title>
              <rect
                x={lm.x - lm.w / 2}
                y={lm.y - lm.h / 2}
                width={lm.w}
                height={lm.h}
                rx={0.8}
                transform={rotate}
                strokeWidth={0.6}
                strokeDasharray={lm.est ? '1.6 1.2' : undefined}
                className={FOOTPRINT_CLASS[lm.kind]}
              />
              <LandmarkContent lm={lm} size={Math.min(ICON_MAX_M, Math.min(lm.w, lm.h) * 0.7)} />
            </g>
          );
        }
        const w = lm.kind === 'feature' ? Math.max(TEXT_CHIP_H_M, (lm.label ?? '').length * 2.4 + 3) : CHIP_M;
        const h = lm.kind === 'feature' ? TEXT_CHIP_H_M : CHIP_M;
        return (
          <g key={i} className="pointer-events-auto">
            <title>{name(lm)}</title>
            <rect
              x={lm.x - w / 2}
              y={lm.y - h / 2}
              width={w}
              height={h}
              rx={1.4}
              className={lm.kind === 'main' ? 'fill-accent-red' : 'fill-text-primary'}
            />
            <LandmarkContent lm={lm} size={CHIP_M * 0.7} />
          </g>
        );
      })}
    </g>
  );
};
