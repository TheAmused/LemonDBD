// frontend/src/components/streaks/page-streak/PerkTile.tsx
'use client';

import React, { useState } from 'react';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { tip } from '@/components/common/Tooltip';

/**
 * Clips the hit area so the overlapping squares of neighbouring rows never steal each other's clicks. It is the diamond grown
 * by half the gap between diamonds (7% of its width) and cut back to the square, so clicks on the thin side tips and in the
 * gaps still land on the nearest perk.
 */
const DIAMOND_CLIP = 'polygon(43% 0, 57% 0, 100% 43%, 100% 57%, 57% 100%, 43% 100%, 0 57%, 0 43%)';

interface PerkTileProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  /** Not part of the confirmed build. */
  faded?: boolean;
  /** Others are picked and this one is not: it steps back so the picks stand out. */
  muted?: boolean;
  iconSrc?: string;
  onToggle?: (name: string) => void;
}

/** One perk as an in-game diamond slot. Its size comes from `--perk-size` set by the grid. */
export const PerkTile: React.FC<PerkTileProps> = ({
  name,
  selected = false,
  disabled = false,
  faded = false,
  muted = false,
  iconSrc,
  onToggle,
}) => {
  const label = usePerkDisplayName()(name);
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(iconSrc) && !imgError;

  const content = (
    <>
      {showImage ? (
        <img
          src={iconSrc}
          alt={label}
          draggable={false}
          onError={() => setImgError(true)}
          className="h-full w-full select-none object-contain"
        />
      ) : (
        <span className="text-tiny font-semibold text-text-muted">{label}</span>
      )}
    </>
  );

  const shell = `relative grid aspect-square w-[var(--perk-size)] place-items-center transition-[filter,transform,opacity] duration-150 motion-reduce:transition-none ${
    selected ? 'z-10 scale-110' : 'hover:brightness-125'
  } ${faded ? 'opacity-35' : ''} ${muted ? 'opacity-55 saturate-50 hover:opacity-100 hover:saturate-100' : ''}`;

  if (disabled || !onToggle) {
    return (
      <div className={shell} style={{ clipPath: DIAMOND_CLIP }}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      aria-label={label}
      {...tip(label, undefined, 'item')}
      className={`${shell} pointer-events-auto cursor-pointer focus:outline-none focus-visible:brightness-150`}
      style={{ clipPath: DIAMOND_CLIP }}
    >
      {content}
    </button>
  );
};
