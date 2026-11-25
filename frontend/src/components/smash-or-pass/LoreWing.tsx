// frontend/src/components/smash-or-pass/LoreWing.tsx

import React from 'react';
import { cn } from '@/lib/cn';

interface LoreWingProps {
  side: 'left' | 'right';
  /** Sits above the watermark. */
  upper: React.ReactNode;
  /** Sits below the watermark. */
  lower: React.ReactNode;
}

const SIDE_CLASS: Record<LoreWingProps['side'], string> = {
  left: 'left-2 sm:left-4 @hub-2xl/hub:left-6',
  right: 'right-2 sm:right-4 @hub-2xl/hub:right-6',
};

/** One column of lore cards beside the Smash card, leaving the watermark between its two cards free. */
export function LoreWing({ side, upper, lower }: LoreWingProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-y-0 hidden @hub-lg/hub:block w-lore-column', SIDE_CLASS[side])}>
      <div className="lore-slot-upper absolute inset-x-0 flex flex-col justify-end p-2 pt-3">{upper}</div>
      <div className="lore-slot-lower absolute inset-x-0 grid items-center p-2">{lower}</div>
    </div>
  );
}
