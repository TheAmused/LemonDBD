'use client';
// frontend/src/components/maps/MapSymbolKey.tsx
/**
 * The key to the symbols a map picture is drawn with, for the map legend: the 1-12 clock callouts, the
 * off-limits area, the 16 m game tile and the landmark codes this map has. The squares of the Main Building and the Shack are LandmarkSquare, in MapLandmarks.
 */
import React from 'react';
import type { MapRealm } from '@/types/map';
import { useDictionary } from '@/context/DictionaryContext';
import { KNOWN_FEATURE_CODES, getFeatureLandmarkName } from '@/utils/mapLandmarkLabels';
import { cn } from '@/utils/cn';

export const MARK_BOX = 'flex h-6 min-w-6 shrink-0 items-center justify-center rounded-control wide:h-7 wide:min-w-7 wide-4k:h-9 wide-4k:min-w-9';
export const MARK_ICON = 'icon-sm wide:icon-md wide-4k:icon-lg';

function KeyRow({ mark, label }: { mark: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2.5 wide-2k:gap-3.5">
      <span className="flex w-14 shrink-0 justify-center wide:w-16 wide-4k:w-20">{mark}</span>
      <span className="type-caption-screen text-text-secondary">{label}</span>
    </li>
  );
}

const CHIP = 'border border-border-color bg-bg-surface px-1.5 type-micro font-bold text-text-primary';

export const MapSymbolKey: React.FC<{ map: MapRealm; className?: string }> = ({ map, className }) => {
  const dict = useDictionary();
  const m = dict.maps;
  // Only what this map's picture actually shows is keyed: its own landmark codes, the off-limits area if it
  // has one, the game tile if it is drawn from a layout.
  const present = new Set<string>();
  let hasBlocked = false;
  for (const floor of map.layout?.floors ?? []) {
    if (floor.blocked?.length) hasBlocked = true;
    for (const lm of floor.landmarks ?? []) {
      if (lm.kind === 'feature' && lm.label) present.add(lm.label);
    }
  }
  const known: readonly string[] = KNOWN_FEATURE_CODES;
  const codes = [...known.filter((code) => present.has(code)), ...[...present].filter((code) => !known.includes(code))];

  return (
    <div data-testid="map-symbol-key" className={cn('space-y-2.5 wide-2k:space-y-3.5', className)}>
      <ul className="space-y-1.5 wide-2k:space-y-2.5">
        <KeyRow mark={<span className={cn(MARK_BOX, CHIP)}>12</span>} label={m.legendClockTitle} />
        {hasBlocked && (
          <KeyRow
            mark={<span className={cn(MARK_BOX, 'border border-text-muted bg-text-muted/40')} aria-hidden="true" />}
            label={m.legendBlocked}
          />
        )}
        {map.layout && (
          <KeyRow
            mark={<span className={cn(MARK_BOX, 'border-2 border-dashed border-text-muted')} aria-hidden="true" />}
            label={m.legendGameTile}
          />
        )}
      </ul>
      {codes.length > 0 && (
        <>
          <h4 className="type-micro font-bold uppercase tracking-wider text-text-muted">{m.legendFeatures}</h4>
          <ul className="space-y-1.5 wide-2k:space-y-2.5">
            {codes.map((code) => (
              <KeyRow
                key={code}
                mark={<span className={cn(MARK_BOX, CHIP)}>{code}</span>}
                label={getFeatureLandmarkName(code, dict)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
