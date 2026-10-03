'use client';
// frontend/src/components/tier-lists/TierItemTile.tsx

import React, { useEffect, useState } from 'react';
import type { TierItem } from '@/types/tierList';
import { cn } from '@/utils/cn';

import { tip } from '@/components/common/Tooltip';
export type TierTileShape = 'square' | 'wide';

// Breakpoints are written as non-overlapping ranges on purpose: Tailwind emits the
// px-based `wide*` breakpoints before the rem-based sm..xl ones, so an open-ended
// `lg:` rule would override `wide-2k:` on the same property.
const SHAPE_CLASSES: Record<TierTileShape, string> = {
  // >= 56px on the smallest screens: comfortably above the 44px touch minimum.
  square: 'w-12 min-[480px]:w-14 sm:max-lg:w-16 lg:max-wide-2k:w-[72px] wide-2k:w-24',
  wide: 'w-[76px] min-[480px]:w-[88px] sm:max-lg:w-24 lg:max-wide-2k:w-28 wide-2k:w-36',
};

const IMAGE_CLASSES: Record<TierTileShape, string> = {
  square: 'h-12 min-[480px]:h-14 sm:max-lg:h-16 lg:max-wide-2k:h-[72px] wide-2k:h-24',
  wide: 'h-12 min-[480px]:h-14 sm:max-lg:h-16 lg:max-wide-2k:h-[72px] wide-2k:h-24',
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
  /** `sm` is a 44px thumbnail for previews; `md` is the board tile. */
  size?: 'sm' | 'md';
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
  const [failed, setFailed] = useState<boolean>(false);
  useEffect(() => setFailed(false), [item.image]);

  const hasImage = Boolean(item.image) && !failed;

  return (
    <div
      ref={ref}
      {...tip(item.name, undefined, 'item')}
      aria-label={item.name}
      className={cn(
        'group relative flex shrink-0 select-none flex-col items-center gap-1 rounded-xl outline-none',
        'touch-pan-y [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-accent-amber',
        size === 'sm' ? 'w-11' : SHAPE_CLASSES[shape],
        ghost && 'opacity-30',
        overlay && 'cursor-grabbing scale-105 drop-shadow-2xl',
        !overlay && 'cursor-grab active:cursor-grabbing',
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-xl border bg-bg-elevated transition-[border-color,box-shadow] duration-150',
          size === 'sm' ? 'h-11' : IMAGE_CLASSES[shape],
          selected
            ? 'border-accent-amber ring-2 ring-accent-amber shadow-lg'
            : 'border-border-color group-hover:border-accent-red/60',
          overlay && 'border-accent-red shadow-xl shadow-accent-red/20'
        )}
      >
        {hasImage ? (
          <img
            src={item.image as string}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={cn(
              'pointer-events-none h-full w-full',
              shape === 'wide' ? 'object-cover' : 'object-contain p-0.5'
            )}
          />
        ) : (
          <span className="px-1 text-center type-card-title text-text-secondary" aria-hidden="true">
            {initials(item.name)}
          </span>
        )}
      </div>
      {showName && (
        <span aria-hidden="true" className="w-full text-center text-tiny sm:text-mini font-bold leading-tight text-text-secondary line-clamp-2 break-words">
          {item.name}
        </span>
      )}
    </div>
  );
});
