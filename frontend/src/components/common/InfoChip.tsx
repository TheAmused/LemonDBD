// frontend/src/components/common/InfoChip.tsx
//
// The one NON-clickable label ("Base game", "Oct 2024", "Licensed"). Flat, borderless, small
// corners, no hover -- the opposite of a clickable capsule (see common/LinkPill), so the two are
// never confused and the difference is shape, not only colour.
import React from 'react';
import { cn } from '@/utils/cn';

export type InfoChipSize = 'md' | 'xs';

/** The height of one row of xs chips: a strip of that height shows only the chips that fit on one line. */
export const INFO_CHIP_XS_ROW = 'h-5 sm:h-6 wide:h-7';

const SIZES: Record<InfoChipSize, string> = {
  md: 'gap-1.5 px-2.5 py-1.5 type-strong',
  // One fixed line height per breakpoint (INFO_CHIP_XS_ROW), for tags packed under a tile (perk types on a perk card).
  xs: `${INFO_CHIP_XS_ROW} gap-1 px-1.5 type-strong-xs sm:px-2 sm:text-xs wide:text-sm`
};

interface InfoChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: InfoChipSize;
}

export function InfoChip({ size = 'md', children, className, ...rest }: InfoChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip bg-bg-elevated/60 text-text-secondary cursor-default select-none',
        SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
