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
  iconSrc?: string;
  onToggle?: (name: string) => void;
}

/** One perk as an in-game diamond slot. Its size comes from `--perk-size` set by the grid. */
export const PerkTile: React.FC<PerkTileProps> = ({
  name,
  selected = false,
  disabled = false,
  faded = false,
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
        <span className="type-strong-2xs text-text-muted">{label}</span>
      )}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full text-accent-red transition-opacity duration-150 ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <polygon points="50,1.5 98.5,50 50,98.5 1.5,50" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </>
  );

  const shell = `relative grid aspect-square w-[var(--perk-size)] place-items-center transition-[filter,transform,opacity] duration-150 motion-reduce:transition-none ${
    selected ? '' : 'hover:brightness-125'
  } ${faded ? 'opacity-35' : ''}`;

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
