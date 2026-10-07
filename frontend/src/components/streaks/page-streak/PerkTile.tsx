// frontend/src/components/streaks/page-streak/PerkTile.tsx
'use client';

import React, { useState } from 'react';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { tip } from '@/components/common/Tooltip';

/** Clips the hit area to the diamond, so the overlapping squares of neighbouring rows never steal each other's clicks. */
const DIAMOND_CLIP = 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)';

interface PerkTileProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  iconSrc?: string;
  onToggle?: (name: string) => void;
}

/** One perk as an in-game diamond slot. Its size comes from `--perk-size` set by the grid. */
export const PerkTile: React.FC<PerkTileProps> = ({
  name,
  selected = false,
  disabled = false,
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
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full text-accent-red transition-opacity duration-150 ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <polygon points="50,3 97,50 50,97 3,50" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="4" />
      </svg>
    </>
  );

  const shell = `relative grid aspect-square w-[var(--perk-size)] place-items-center transition-[filter,transform] duration-150 motion-reduce:transition-none ${
    selected ? '' : 'hover:brightness-125'
  }`;

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
      className={`${shell} cursor-pointer focus:outline-none focus-visible:brightness-150`}
      style={{ clipPath: DIAMOND_CLIP }}
    >
      {content}
    </button>
  );
};
