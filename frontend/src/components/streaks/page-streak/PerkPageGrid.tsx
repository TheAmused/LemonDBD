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

/** In-game page layout: rows alternate 5 and 4 diamonds, the shorter ones sitting in the gaps of the longer ones. */
const ROW_SIZES = [5, 4];

function toRows(perks: string[]): string[][] {
  const rows: string[][] = [];
  for (let start = 0, row = 0; start < perks.length; row += 1) {
    const size = ROW_SIZES[row % ROW_SIZES.length];
    rows.push(perks.slice(start, start + size));
    start += size;
  }
  return rows;
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
  // A diamond is as wide as its square, so five of them fill the container; the cap keeps them from growing huge on wide screens.
  const maxSize = dimmed ? '3.5rem' : '8rem';
  const style = { '--perk-size': `min(${maxSize}, 19.5cqw)` } as React.CSSProperties;

  return (
    <div className="[container-type:inline-size]">
      <div
        style={style}
        className={`flex flex-col items-center ${animation} ${dimmed ? 'pointer-events-none opacity-40 grayscale' : ''}`}
      >
        {toRows(perks).map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center"
            style={rowIndex === 0 ? undefined : { marginTop: 'calc(var(--perk-size) * -0.5)' }}
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
