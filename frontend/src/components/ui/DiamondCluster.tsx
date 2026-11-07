// frontend/src/components/ui/DiamondCluster.tsx
// A few perk diamonds packed into one shape, like the build on the profile card.

import React from 'react';
import { cn } from '@/utils/cn';

/** Distance between neighbouring diamond centres, in diamond widths (0.5 would make their edges touch). */
const STEP = 0.57;

type Spot = readonly [x: number, y: number];

const TOP: Spot = [0, -STEP];
const RIGHT: Spot = [STEP, 0];
const BOTTOM: Spot = [0, STEP];
const LEFT: Spot = [-STEP, 0];

/** Where each count of diamonds sits, so a short set still reads as one tight shape. */
const LAYOUTS: Record<number, readonly Spot[]> = {
  1: [[0, 0]],
  2: [LEFT, RIGHT],
  3: [LEFT, TOP, RIGHT],
  4: [TOP, RIGHT, BOTTOM, LEFT],
};

const MAX_ITEMS = 4;

/** A length in diamond widths; `--perk-size` is set by the caller and is the width of one diamond. */
const widths = (n: number): string => `calc(var(--perk-size) * ${Number(n.toFixed(2))})`;

interface DiamondClusterProps {
  /** One node per diamond, each as wide as `--perk-size`. */
  items: React.ReactNode[];
  className?: string;
  'aria-label'?: string;
}

export const DiamondCluster: React.FC<DiamondClusterProps> = ({ items, className, 'aria-label': ariaLabel }) => {
  const count = Math.min(items.length, MAX_ITEMS);
  if (count === 0) return null;

  const spots = LAYOUTS[count];
  const minX = Math.min(...spots.map(([x]) => x));
  const minY = Math.min(...spots.map(([, y]) => y));
  const width = Math.max(...spots.map(([x]) => x)) - minX + 1;
  const height = Math.max(...spots.map(([, y]) => y)) - minY + 1;

  return (
    <div
      aria-label={ariaLabel}
      className={cn('relative shrink-0', className)}
      style={{ width: widths(width), height: widths(height) }}
    >
      {spots.map(([x, y], index) => (
        <div
          key={index}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: widths(x - minX + 0.5), top: widths(y - minY + 0.5) }}
        >
          {items[index]}
        </div>
      ))}
    </div>
  );
};
