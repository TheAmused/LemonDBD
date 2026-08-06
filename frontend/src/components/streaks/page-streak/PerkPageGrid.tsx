'use client';

import React from 'react';
import { PerkTile } from './PerkTile';

interface PerkPageGridProps {
  perks: string[];
  selected?: string[];
  onToggle?: (name: string) => void;
  dimmed?: boolean;
  variant?: 'enter' | 'reset' | 'none';
}

export const PerkPageGrid: React.FC<PerkPageGridProps> = ({
  perks,
  selected = [],
  onToggle,
  dimmed = false,
  variant = 'none',
}) => {
  const animation = variant === 'enter' ? 'ps-page-enter' : variant === 'reset' ? 'ps-page-reset' : '';

  return (
    <div
      className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 ${animation} ${
        dimmed ? 'pointer-events-none opacity-40 grayscale' : ''
      }`}
    >
      {perks.map((name) => (
        <PerkTile
          key={name}
          name={name}
          selected={selected.includes(name)}
          disabled={dimmed || !onToggle}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};
