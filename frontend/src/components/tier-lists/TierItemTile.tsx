'use client';
// frontend/src/components/tier-lists/TierItemTile.tsx

import React, { useEffect, useState } from 'react';
import { FitText } from '@/components/common/FitText';
import { PerkIcon } from '@/components/ui/PerkIcon';
import type { TierItem } from '@/types/tierList';
import { cn } from '@/utils/cn';

import { tip } from '@/components/common/Tooltip';
export type TierTileShape = 'square' | 'wide';

// Breakpoints are written as non-overlapping ranges on purpose: Tailwind emits the
// px-based `wide*` breakpoints before the rem-based sm..xl ones, so an open-ended
// `lg:` rule would override `wide-2k:` on the same property.
const SHAPE_CLASSES: Record<TierTileShape, string> = {
  // >= 56px on the smallest screens: comfortably above the 44px touch minimum.
  square: 'w-12 phone-lg:w-14 sm:max-lg:w-16 lg:max-wide-2k:w-18 wide-2k:w-24',
  wide: 'w-19 phone-lg:w-22 sm:max-lg:w-24 lg:max-wide-2k:w-28 wide-2k:w-36',
};

const IMAGE_CLASSES: Record<TierTileShape, string> = {
  square: 'h-12 phone-lg:h-14 sm:max-lg:h-16 lg:max-wide-2k:h-18 wide-2k:h-24',
  wide: 'h-12 phone-lg:h-14 sm:max-lg:h-16 lg:max-wide-2k:h-18 wide-2k:h-24',
};

const LG_SHAPE_CLASSES: Record<TierTileShape, string> = {
  square: 'w-20 phone-lg:w-24 sm:w-28',
  wide: 'w-32 phone-lg:w-40 sm:w-48',
};

const LG_IMAGE_CLASSES: Record<TierTileShape, string> = {
  square: 'h-20 phone-lg:h-24 sm:h-28',
  wide: 'h-20 phone-lg:h-24 sm:h-28',
};

/** `William "Bill" Overbeck` -> `WB`: first letter of the first two words that have one. */
function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  const letters = words.length > 1 ? [...words[0]][0] + [...words[1]][0] : [...words[0]].slice(0, 2).join('');
  return letters.toUpperCase();
}

interface TierItemTileProps extends React.HTMLAttributes<HTMLDivElement> {
  item: TierItem;
  shape?: TierTileShape;
  showName?: boolean;
  selected?: boolean;
  /** The copy that follows the pointer while dragging. */
  overlay?: boolean;
  /** The placeholder left behind in the list while its overlay is dragged. */
  ghost?: boolean;
  /** `sm` is a 44px thumbnail for previews; `md` is the board tile; `lg` is catalog item. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * One rankable thing: its picture (or initials when there is none or it fails
 * to load), and optionally its name underneath. Purely presentational -- the
 * drag wiring lives in SortableTierItem.
 */
export const TierItemTile = React.forwardRef<HTMLDivElement, TierItemTileProps>(function TierItemTile(
  { item, shape = 'square', showName = false, selected = false, overlay = false, ghost = false, size = 'md', className, ...rest },
  ref
) {
  const hasImage = Boolean(item.image);

  return (
    <div
      ref={ref}
      {...tip(item.name, undefined, 'item')}
      aria-label={item.name}
      className={cn(
        'group relative flex shrink-0 select-none flex-col items-center gap-1 rounded-card outline-none',
        'touch-pan-y [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-accent-amber',
        size === 'sm'
          ? 'w-11'
          : size === 'lg'
            ? LG_SHAPE_CLASSES[shape]
            : cn(SHAPE_CLASSES[shape], 'group-data-[fit]/board:w-(--tile-w)!'),
        ghost && 'opacity-30',
        overlay && 'cursor-grabbing scale-105',
        !overlay && 'cursor-grab active:cursor-grabbing',
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-card border transition-[border-color] duration-150',
          size === 'sm'
            ? 'h-11'
            : size === 'lg'
              ? cn(LG_IMAGE_CLASSES[shape], 'rounded-chip border-border-color bg-bg-elevated/40')
              : cn(IMAGE_CLASSES[shape], 'group-data-[fit]/board:h-(--tile)!'),
          // A bare icon sits straight on the board; the plate and border only come back for selection, hover and the placeholder.
          hasImage ? (size === 'lg' ? 'bg-bg-elevated/40' : 'bg-transparent') : 'bg-bg-elevated',
          selected
            ? 'border-accent-amber ring-2 ring-accent-amber'
            : cn('group-hover:border-accent-red/60', hasImage && size !== 'lg' ? 'border-transparent' : 'border-border-color')
        )}
      >
        <PerkIcon
          src={item.image}
          alt=""
          imageClassName={cn(
            'pointer-events-none h-full w-full',
            shape === 'wide' ? 'object-cover' : 'object-contain p-0.5'
          )}
          fallbackIcon={
            <span className="px-1 text-center type-card-title text-text-secondary" aria-hidden="true">
              {initials(item.name)}
            </span>
          }
        />
      </div>
      {showName && (
        <FitText
          aria-hidden="true"
          minScale={size === 'lg' ? 0.75 : 0.65}
          maxLines={size === 'lg' ? 2 : 1}
          className={cn(
            'w-full text-center font-bold leading-tight text-text-secondary',
            size === 'lg'
              ? 'px-0.5 text-xs sm:text-caption mt-0.5'
              : 'text-tiny sm:text-mini group-data-[fit]/board:text-(length:--tile-fs)'
          )}
        >
          {item.name}
        </FitText>
      )}
    </div>
  );
});
