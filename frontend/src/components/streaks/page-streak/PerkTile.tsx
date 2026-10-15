// frontend/src/components/streaks/page-streak/PerkTile.tsx
'use client';

import React, { useState } from 'react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { DIAMOND_CLIP } from '@/components/ui/DiamondSlot';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { tip } from '@/components/common/Tooltip';
import { TileButton } from '@/components/common/TileButton';

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

  const content = (
    <>
      <PerkIcon
        src={iconSrc}
        alt={label}
        imageClassName="h-full w-full select-none object-contain"
        fallbackIcon={<span className="type-strong-2xs text-text-muted">{label}</span>}
      />
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
    <TileButton press={false}
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      aria-label={label}
      {...tip(label, undefined, 'item')}
      className={`${shell} pointer-events-auto focus-visible:brightness-150`}
      style={{ clipPath: DIAMOND_CLIP }}
    >
      {content}
    </TileButton>
  );
};
