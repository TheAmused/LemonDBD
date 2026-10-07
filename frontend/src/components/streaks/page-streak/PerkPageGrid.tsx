// frontend/src/components/streaks/page-streak/PerkPageGrid.tsx
'use client';

import React from 'react';
import { PerkTile } from './PerkTile';

interface PerkPageGridProps {
  perks: string[];
  selected?: string[];
  onToggle?: (name: string) => void;
  dimmed?: boolean;
  variant?: 'enter' | 'reset' | 'none';
  iconByPerk?: Record<string, string>;
}

/** The in-game page: rows alternate 5 and 4 diamonds, the shorter ones sitting in the gaps of the longer ones. */
const ALTERNATING_ROWS = [5, 4];
const MAX_ROW = 5;
/** Space between neighbouring diamonds, as a share of one diamond's width. */
const GAP_RATIO = 0.14;

interface PageLayout {
  rows: string[][];
  /** Equal rows of 5 are shifted by half a diamond, each row against the one above it. */
  staggered: boolean;
}

function layoutPage(perks: string[]): PageLayout {
  let capacity = 0;
  let rowCount = 0;
  while (capacity < perks.length) {
    capacity += ALTERNATING_ROWS[rowCount % ALTERNATING_ROWS.length];
    rowCount += 1;
  }
  const rows: string[][] = [];
  if (capacity === perks.length) {
    for (let start = 0, row = 0; start < perks.length; row += 1) {
      const size = ALTERNATING_ROWS[row % ALTERNATING_ROWS.length];
      rows.push(perks.slice(start, start + size));
      start += size;
    }
    return { rows, staggered: false };
  }
  // A page that does not fill the 5/4 pattern would leave a lone diamond on the last row, so it is cut into even rows instead.
  const evenCount = Math.ceil(perks.length / MAX_ROW);
  const size = Math.ceil(perks.length / evenCount);
  for (let start = 0; start < perks.length; start += size) rows.push(perks.slice(start, start + size));
  return { rows, staggered: rows.length > 1 };
}

export const PerkPageGrid: React.FC<PerkPageGridProps> = ({
  perks,
  selected = [],
  onToggle,
  dimmed = false,
  variant = 'none',
  iconByPerk = {},
}) => {
  const animation = variant === 'enter' ? 'ps-page-enter' : variant === 'reset' ? 'ps-page-reset' : '';
  const { rows, staggered } = layoutPage(perks);
  // The widest row is 5 diamonds and 4 gaps wide (plus half a pitch when staggered); the cap keeps them from growing huge on wide screens.
  const rowWidth = MAX_ROW + (MAX_ROW - 1) * GAP_RATIO + (staggered ? (1 + GAP_RATIO) / 2 : 0);
  const maxSize = dimmed ? '3.5rem' : '8rem';
  const style = {
    '--perk-size': `min(${maxSize}, ${(100 / rowWidth).toFixed(2)}cqw)`,
    '--perk-gap': `calc(var(--perk-size) * ${GAP_RATIO})`,
  } as React.CSSProperties;

  return (
    <div className="[container-type:inline-size]">
      <div
        style={style}
        className={`flex flex-col items-center ${animation} ${dimmed ? 'pointer-events-none opacity-40 grayscale' : ''}`}
      >
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center gap-x-[var(--perk-gap)]"
            style={{
              marginTop: rowIndex === 0 ? undefined : 'calc((var(--perk-size) - var(--perk-gap)) / -2)',
              transform: staggered ? `translateX(calc((var(--perk-size) + var(--perk-gap)) * ${rowIndex % 2 ? 0.25 : -0.25}))` : undefined,
            }}
          >
            {row.map((name) => (
              <PerkTile
                key={name}
                name={name}
                selected={selected.includes(name)}
                disabled={dimmed || !onToggle}
                iconSrc={iconByPerk[name]}
                onToggle={onToggle}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
